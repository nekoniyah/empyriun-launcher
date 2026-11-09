import { Electroview } from 'electrobun/view'
import type { AccountSummary, AuthResult, DeviceCodePrompt } from '../../../shared/auth'
import type { AppResult, GameState, InstallProgress, SettingsPatch, SettingsView } from '../../../shared/game'
import type { LogChunk, LogFile, LogGroup, LogMatch } from '../../../shared/logs'
import type { MetadataSummary, PackSummary } from '../../../shared/content'
import type { ContentImage } from '../../../shared/content-image'
import type { IntegrityReport } from '../../../shared/integrity'
import type { SkinImage } from '../../../shared/skin'
import type { MainRPC } from '../../../shared/rpc'
import { Channel } from './store'

export class Bridge {
  readonly login = new Channel<AuthResult<readonly AccountSummary[]>>()
  readonly progress = new Channel<InstallProgress>()
  readonly gameState = new Channel<GameState>()
  readonly maximized = new Channel<boolean>()

  private readonly rpc = Electroview.defineRPC<MainRPC>({
    maxRequestTime: 600000,
    handlers: {
      requests: {},
      messages: {
        windowStateChanged: ({ isMaximized }) => this.maximized.emit(isMaximized),
        trayAction: () => undefined,
        loginFinished: ({ result }) => this.login.emit(result),
        installProgress: ({ progress }) => this.progress.emit(progress),
        gameStateChanged: ({ state }) => this.gameState.emit(state)
      }
    }
  })

  private readonly view = new Electroview({ rpc: this.rpc })

  private get api() {
    const rpc = this.view.rpc
    if (!rpc) throw new Error('RPC is not available')
    return rpc
  }

  async waitUntilConnected(): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        await this.api.request.ping({})
        return
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 150))
      }
    }
    throw new Error('Backend did not respond')
  }

  listAccounts(): Promise<readonly AccountSummary[]> {
    return this.api.request.listAccounts({})
  }

  beginLogin(): Promise<AuthResult<DeviceCodePrompt>> {
    return this.api.request.beginLogin({})
  }

  cancelLogin(): Promise<boolean> {
    return this.api.request.cancelLogin({})
  }

  switchAccount(accountId: string): Promise<AuthResult<readonly AccountSummary[]>> {
    return this.api.request.switchAccount({ accountId })
  }

  removeAccount(accountId: string): Promise<AuthResult<readonly AccountSummary[]>> {
    return this.api.request.removeAccount({ accountId })
  }

  verifyActiveAccount(): Promise<AuthResult<AccountSummary>> {
    return this.api.request.verifyActiveAccount({})
  }

  getMetadata(): Promise<AppResult<MetadataSummary>> {
    return this.api.request.getMetadata({})
  }

  prepareGame(repair: boolean): Promise<AppResult<PackSummary>> {
    return this.api.request.prepareGame({ repair })
  }

  play(repair: boolean): Promise<AppResult<GameState>> {
    return this.api.request.play({ repair })
  }

  stopGame(): Promise<boolean> {
    return this.api.request.stopGame({})
  }

  getGameState(): Promise<GameState> {
    return this.api.request.getGameState({})
  }

  getSettings(): Promise<SettingsView> {
    return this.api.request.getSettings({})
  }

  saveSettings(patch: SettingsPatch): Promise<AppResult<SettingsView>> {
    return this.api.request.saveSettings({ patch })
  }

  dragBegin(x: number, y: number): void {
    this.api.send.dragBegin({ x, y })
  }

  dragMove(x: number, y: number): void {
    this.api.send.dragMove({ x, y })
  }

  dragEnd(): void {
    this.api.send.dragEnd({})
  }

  openLink(url: string): Promise<boolean> {
    return this.api.request.openLink({ url })
  }

  notifyReady(): void {
    this.api.send.appReady({})
  }

  closeWindow(): void {
    this.api.send.closeWindow({})
  }

  minimizeWindow(): void {
    this.api.send.minimizeWindow({})
  }

  maximizeWindow(): void {
    this.api.send.maximizeWindow({})
  }

  listLogs(): Promise<readonly LogFile[]> {
    return this.api.request.listLogs({})
  }

  readLog(id: string, offset: number): Promise<AppResult<LogChunk>> {
    return this.api.request.readLog({ id, offset })
  }

  auditInstance(): Promise<AppResult<IntegrityReport | null>> {
    return this.api.request.auditInstance({})
  }

  deleteLog(id: string): Promise<AppResult<boolean>> {
    return this.api.request.deleteLog({ id })
  }

  clearLogs(group: LogGroup): Promise<AppResult<number>> {
    return this.api.request.clearLogs({ group })
  }

  searchLogs(query: string): Promise<AppResult<readonly LogMatch[]>> {
    return this.api.request.searchLogs({ query })
  }

  getSkin(accountId: string): Promise<AppResult<SkinImage>> {
    return this.api.request.getSkin({ accountId })
  }

  getContentImage(url: string): Promise<AppResult<ContentImage>> {
    return this.api.request.getContentImage({ url })
  }
}