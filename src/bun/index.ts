import { BrowserView, BrowserWindow, Utils } from 'electrobun/bun'
import { join } from 'node:path'
import { acquireSingleInstanceLock, onFocusRequest, releaseSingleInstanceLock } from './single-instance'
import { getCrashLogPath, installCrashLogger } from './crash-log'
import { ContentMediaService } from './content/media-service'
import { WindowDragger } from './window/window-dragger'
import { UpdateService } from './update/update-service'
import { WindowGuard } from './window/window-guard'
import type { AuthResult } from '../../shared/auth'
import { WindowIcon } from './window/window-icon'
import { SkinService } from './skin/skin-service'
import { GameService } from './game/game-service'
import { AuthService } from './auth/auth-service'
import { LogService } from './logs/log-service'
import type { MainRPC } from '../../shared/rpc'
import { attemptApp } from './core/app-result'
import appConfig from '../../app.config'
import { attempt } from './auth/result'
import { AppPaths } from './core/paths'
import { TrayController } from './tray'

const MAIN_VIEW_URL = 'views://mainview/index.html'
const REVEAL_FALLBACK_MS = 10000

class LauncherApp {
  private window!: BrowserWindow
  private dragger: WindowDragger | null = null
  private loginUri: string | null = null
  private revealed = false
  private closing = false
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null
  private readonly paths = new AppPaths()
  private readonly auth = AuthService.create(this.paths)
  private readonly game: GameService = GameService.create(this.paths, (progress) => this.rpc.send.installProgress({ progress }), (state) => {
    this.rpc.send.gameStateChanged({ state })
    if (state.phase === 'idle') this.updates.poke()
  })
  private readonly contentMedia = new ContentMediaService((url) => this.game.isKnownMedia(url), new Set([new URL(appConfig.content.metadataUrl).hostname]), `${appConfig.name}/${appConfig.version}`)
  private readonly logs = new LogService(getCrashLogPath(), () => {
    const id = this.game.currentPackId()
    return id ? this.paths.instanceDir(id) : null
  }, () => this.game.getState().phase === 'running')
  private readonly updates = new UpdateService(join(this.paths.root, 'update-staged.json'), () => this.game.getState().phase !== 'idle', (state) => this.rpc.send.updateStateChanged({ state }))
  private readonly icon = new WindowIcon(join(this.paths.root, 'cache'), appConfig.title)
  private readonly tray = new TrayController(join(this.paths.root, 'cache'), () => this.reveal(), (action) => this.rpc.send.trayAction({ action }))
  private readonly skins = new SkinService((id) => this.auth.skinSource(id), `${appConfig.name}/${appConfig.version}`)

  private readonly rpc = BrowserView.defineRPC<MainRPC>({
    maxRequestTime: 600000,
    handlers: {
      requests: {
        ping: () => 'pong',
        listAccounts: () => this.auth.listAccounts(),
        beginLogin: () => attempt(() => this.startLogin()),
        cancelLogin: () => this.auth.cancelLogin(),
        switchAccount: ({ accountId }) => attempt(() => this.auth.switchAccount(accountId)),
        removeAccount: ({ accountId }) => attempt(() => this.auth.removeAccount(accountId)),
        verifyActiveAccount: () => attempt(() => this.auth.verifyActiveAccount()),
        getMetadata: () => attemptApp(() => this.game.summary()),
        prepareGame: ({ repair }) => attemptApp(() => this.game.prepare(repair)),
        play: ({ repair }) => attemptApp(() => this.game.play(this.auth, repair)),
        stopGame: () => this.game.stop(),
        getGameState: () => this.game.getState(),
        getSettings: () => this.game.settingsView(),
        saveSettings: ({ patch }) => attemptApp(() => this.game.saveSettings(patch)),
        openLink: ({ url }) => (this.game.isKnownLink(url) || url === this.loginUri) && Utils.openExternal(url),
        listLogs: () => this.logs.list(),
        readLog: ({ id, offset }) => attemptApp(() => this.logs.read(id, offset)),
        auditInstance: () => attemptApp(() => this.game.audit()),
        deleteLog: ({ id }) => attemptApp(() => this.logs.delete(id)),
        clearLogs: ({ group }) => attemptApp(() => this.logs.clear(group)),
        searchLogs: ({ query }) => attemptApp(() => this.logs.search(query)),
        getSkin: ({ accountId }) => attemptApp(() => this.skins.load(accountId)),
        getContentImage: ({ url }) => attemptApp(() => this.contentMedia.load(url)),
        getUpdateState: () => this.updates.snapshot(),
      },
      messages: {
        log: ({ message }) => console.log('Webview:', message),
        appReady: () => this.reveal(),
        closeWindow: () => this.shutdown(),
        minimizeWindow: () => this.window.minimize(),
        maximizeWindow: () => (this.window.isMaximized() ? this.window.unmaximize() : this.window.maximize()),
        dragBegin: ({ x, y }) => this.dragger?.begin(x, y),
        dragMove: ({ x, y }) => this.dragger?.move(x, y),
        dragEnd: () => this.dragger?.end(),
      }
    }
  })

  start(): void {
    this.window = new BrowserWindow({
      title: appConfig.title,
      url: MAIN_VIEW_URL,
      frame: { width: appConfig.window.width, height: appConfig.window.height, x: 100, y: 100 },
      titleBarStyle: 'hidden',
      hidden: true,
      transparent: appConfig.window.transparent,
      rpc: this.rpc
    })
    const guard = new WindowGuard(this.window)
    guard.install()
    this.dragger = new WindowDragger(this.window, guard)
    onFocusRequest(() => this.reveal())
    this.window.on('resize', () => this.broadcastWindowState())
    this.window.on('move', () => this.broadcastWindowState())
    this.window.on('close', () => this.shutdown())
    this.tray.create()
    this.fallbackTimer = setTimeout(() => this.reveal(), REVEAL_FALLBACK_MS)
    this.updates.start()
  }

  private shutdown(): void {
    if (this.closing) return
    this.closing = true
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer)
    releaseSingleInstanceLock()
    this.tray.destroy()
    this.updates.stop()
    try { Utils.quit() } catch (error) { console.error('Quit failed', error) }
    setTimeout(() => this.terminate(), 350)
  }

  private reveal(): void {
    if (this.closing) return
    this.window.show()
    this.window.activate()
    console.log('Window icon applied to', this.icon.apply(), 'window(s)')
    if (this.revealed) return
    this.revealed = true
    setTimeout(() => this.icon.apply(), 600)
    setTimeout(() => this.icon.apply(), 2500)
  }

  private async startLogin(): ReturnType<AuthService['beginLogin']> {
    const prompt = await this.auth.beginLogin((result) => this.notifyLogin(result))
    this.loginUri = prompt.verificationUri
    Utils.openExternal(prompt.verificationUri)
    return prompt
  }

  private notifyLogin(result: AuthResult<Awaited<ReturnType<AuthService['switchAccount']>>>): void {
    this.rpc.send.loginFinished({ result })
  }

  private broadcastWindowState(): void {
    if (this.closing) return
    this.rpc.send.windowStateChanged({ isMaximized: this.window.isMaximized() })
  }

  private terminate(): void {
    try { process.kill(process.pid, 'SIGKILL') } catch { process.exit(0) }
  }
}

installCrashLogger()
if (!(await acquireSingleInstanceLock())) process.exit(0)
await UpdateService.applyStaged(join(new AppPaths().root, 'update-staged.json'), { before: () => releaseSingleInstanceLock(), restore: () => acquireSingleInstanceLock() })
new LauncherApp().start()