import type { AccountSummary, AuthResult, DeviceCodePrompt } from '../../../shared/auth'
import type { GameState, InstallProgress, SettingsPatch, SettingsView } from '../../../shared/game'
import type { Language, ThemeId } from '../../../shared/preferences'
import type { ContentImage } from '../../../shared/content-image'
import type { IntegrityReport } from '../../../shared/integrity'
import type { MetadataSummary } from '../../../shared/content'
import type { SkinImage } from '../../../shared/skin'
import { setLanguage, T } from '../lib/strings'
import { Channel, Store } from '../lib/store'
import type { IconName } from '../lib/icons'
import type { Bridge } from '../lib/bridge'
import { themes } from '../lib/theme'

export type ViewId = 'home' | 'updates' | 'shop' | 'accounts' | 'settings' | 'logs'
export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  readonly id: number
  readonly kind: ToastKind
  readonly message: string
}

export interface LoginState {
  readonly prompt: DeviceCodePrompt
  readonly startedAt: number
}

export interface AppState {
  readonly loaded: boolean
  readonly accounts: readonly AccountSummary[]
  readonly metadata: MetadataSummary | null
  readonly metadataError: string | null
  readonly game: GameState
  readonly progress: InstallProgress | null
  readonly settings: SettingsView | null
  readonly login: LoginState | null
  readonly maximized: boolean
  readonly integrity: IntegrityReport | null
}

const TOAST_MS = 5000

export class AppController {
  readonly state = new Store<AppState>({
    loaded: false,
    accounts: [],
    metadata: null,
    metadataError: null,
    game: { phase: 'idle', pid: null, exitCode: null },
    progress: null,
    settings: null,
    login: null,
    maximized: false,
    integrity: null,
  })

  readonly view = new Store<ViewId>('home')
  readonly toasts = new Store<readonly Toast[]>([])
  readonly paletteRequests = new Channel<void>()
  readonly logoClicks = new Channel<{ readonly x: number, readonly y: number }>()
  readonly achievements = new Channel<{ readonly title: string, readonly icon: IconName }>()
  readonly contentImages = new Store<ReadonlyMap<string, ContentImage>>(new Map())
  readonly skins = new Store<ReadonlyMap<string, SkinImage>>(new Map())
  private toastCounter = 0

  constructor(readonly bridge: Bridge) {
    bridge.login.on((result) => this.onLoginFinished(result))
    bridge.progress.on((progress) => this.state.update({ progress }))
    bridge.gameState.on((game) => this.onGameState(game))
    bridge.maximized.on((maximized) => this.state.update({ maximized }))
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.loadAccounts(),
        this.loadMetadata(),
        this.loadGame(),
        this.loadSettings(),
      ])
      await this.runAudit(true)
    } finally {
      this.state.update({ loaded: true })
    }
  }

  async loadMetadata(): Promise<void> {
    this.contentImages.set(new Map())
    const result = await this.bridge.getMetadata()
    if (result.ok) this.state.update({ metadata: result.value, metadataError: null })
    else this.state.update({ metadataError: result.error.message })
  }

  async signIn(): Promise<void> {
    const result = await this.bridge.beginLogin()
    if (!result.ok) return this.notify('error', result.error.message)
    this.state.update({ login: { prompt: result.value, startedAt: Date.now() } })
  }

  async cancelLogin(): Promise<void> {
    await this.bridge.cancelLogin()
    this.state.update({ login: null })
  }

  async switchAccount(accountId: string): Promise<void> {
    this.applyAccounts(await this.bridge.switchAccount(accountId))
  }

  async removeAccount(accountId: string): Promise<void> {
    this.applyAccounts(await this.bridge.removeAccount(accountId))
  }

  async verifyActive(): Promise<void> {
    const result = await this.bridge.verifyActiveAccount()
    if (result.ok) this.notify('success', T.toast.verified(result.value.name))
    else this.notify('error', result.error.message)
  }

  async play(repair: boolean): Promise<void> {
    if (!this.state.get().accounts.some((account) => account.active)) return this.go('accounts')
    const result = await this.bridge.play(repair)
    if (!result.ok) this.notify('error', result.error.message)
  }

  async repair(): Promise<void> {
    this.state.update({ progress: null })
    const result = await this.bridge.prepareGame(true)
    if (result.ok) this.notify('success', T.toast.repaired)
    else this.notify('error', result.error.message)
  }

  async stop(): Promise<void> {
    await this.bridge.stopGame()
  }

  async loadPreferences(): Promise<void> {
    const settings = await this.bridge.getSettings()
    this.state.update({ settings })
    setLanguage(settings.language as Language)
    this.applyTheme(settings.theme as ThemeId)
  }

  async savePreferences(patch: SettingsPatch): Promise<void> {
    if (patch.theme) this.applyTheme(patch.theme)
    const result = await this.bridge.saveSettings(patch)
    if (!result.ok) return this.notify('error', result.error.message)
    this.state.update({ settings: result.value })
    if (patch.language) location.reload()
  }

  async saveMemory(memoryMb: number): Promise<void> {
    await this.savePreferences({ memoryMb })
  }

  achieve(title: string, iconName: IconName): void {
    this.achievements.emit({ title, icon: iconName })
  }

  async unlockClassic(): Promise<void> {
    const first = !this.state.get().settings?.unlocked.includes('classic')
    await this.savePreferences({ unlock: 'classic' })
    await this.savePreferences({ theme: 'classic' })
    this.achieve(T.eggs.classicTitle, 'cube')
    if (first) this.notify('success', T.eggs.classicUnlocked)
  }

  private applyTheme(theme: string): void {
    themes.set(theme as ThemeId)
  }

  async openLink(url: string): Promise<void> {
    if (!(await this.bridge.openLink(url))) this.notify('error', T.toast.linkFailed)
  }

  async runAudit(announce: boolean): Promise<void> {
    const result = await this.bridge.auditInstance()
    if (!result.ok) return void this.notify('error', result.error.message)
    this.state.update({ integrity: result.value })
    const report = result.value
    if (!announce || !report) return
    const problems = report.files.filter((file) => file.state !== 'ok').length
    if (report.disabled.length > 0) this.notify('info', T.integrity.disabled(report.disabled.length))
    if (report.removed.length > 0) this.notify('info', T.integrity.removed(report.removed.length))
    if (problems > 0) this.notify('error', T.integrity.needsRepair(problems))
  }

  go(view: ViewId): void {
    this.view.set(view)
  }

  notify(kind: ToastKind, message: string): void {
    this.toastCounter += 1
    const toast: Toast = { id: this.toastCounter, kind, message }
    this.toasts.set([...this.toasts.get(), toast])
    setTimeout(() => this.toasts.set(this.toasts.get().filter((item) => item.id !== toast.id)), TOAST_MS)
  }

  async ensureSkin(accountId: string): Promise<SkinImage | null> {
    const known = this.skins.get().get(accountId)
    if (known) return known
    const result = await this.bridge.getSkin(accountId)
    if (!result.ok) return null
    const next = new Map(this.skins.get())
    next.set(accountId, result.value)
    this.skins.set(next)
    return result.value
  }

  private async loadAccounts(): Promise<void> {
    this.state.update({ accounts: await this.bridge.listAccounts() })
  }

  private async loadGame(): Promise<void> {
    this.state.update({ game: await this.bridge.getGameState() })
  }

  private async loadSettings(): Promise<void> {
    this.state.update({ settings: await this.bridge.getSettings() })
  }

  private applyAccounts(result: AuthResult<readonly AccountSummary[]>): void {
    if (result.ok) this.state.update({ accounts: result.value })
    else this.notify('error', result.error.message)
  }

  private onLoginFinished(result: AuthResult<readonly AccountSummary[]>): void {
    this.skins.set(new Map())
    this.state.update({ login: null })
    if (!result.ok) return this.notify('error', result.error.message)
    this.state.update({ accounts: result.value })
    const active = result.value.find((account) => account.active)
    this.notify('success', active ? T.toast.signedIn(active.name) : T.toast.signedInPlain)
  }

  private onGameState(game: GameState): void {
    const previous = this.state.get().game.phase
    this.state.update({ game, ...(game.phase === 'idle' ? { progress: null } : {}) })
    if (game.phase === 'launching') void this.loadSettings()
    if (game.phase === 'idle' && previous !== 'idle') void this.runAudit(false)
    if (game.phase === 'idle' && game.exitCode !== null && game.exitCode !== 0) this.notify('error', T.toast.gameClosed(game.exitCode))
  }

  async ensureContentImage(url: string): Promise<ContentImage | null> {
    const existing = this.contentImages.get().get(url)
    if (existing) return existing
    const result = await this.bridge.getContentImage(url)
    if (!result.ok) return null
    const next = new Map(this.contentImages.get())
    next.set(url, result.value)
    this.contentImages.set(next)
    return result.value
  }
}