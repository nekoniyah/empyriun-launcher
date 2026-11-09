import appConfig from '../../../app.config'
import type { MetadataSummary, PackSummary } from '../../../shared/content'
import type { GamePhase, GameSettings, GameState, InstallProgress, SettingsView } from '../../../shared/game'
import type { IntegrityReport } from '../../../shared/integrity'
import { AuthError } from '../auth/auth-error'
import { MetadataClient } from '../content/metadata-client'
import { MetadataParser } from '../content/metadata-parser'
import type { PackManifest, LauncherMetadata } from '../content/metadata-types'
import type { JvmArgument } from '../../../shared/jvm-flags'
import { GameError } from '../core/game-error'
import { LOADER_HOSTS, MOJANG_HOSTS } from '../core/hosts'
import type { AppPaths } from '../core/paths'
import { Platform } from '../core/platform'
import { ArgumentBuilder } from './argument-builder'
import { AssetManager } from './asset-manager'
import { Downloader } from './downloader'
import { GameInstaller, type PreparedGame } from './game-installer'
import { GameLauncher, type SessionSource } from './game-launcher'
import { JavaRuntimeManager } from './java-runtime'
import { LibraryPlanner } from './library-planner'
import { LoaderInstaller } from './loader-installer'
import { PackSynchronizer } from './pack-synchronizer'
import { ProgressReporter } from './progress-reporter'
import { RuleEvaluator } from './rules'
import { SettingsStore } from './settings-store'
import { VersionRepository } from './version-repository'

const IDLE: GameState = { phase: 'idle', pid: null, exitCode: null }

export class GameService {
  private state: GameState = IDLE
  private packId: string | null = null
  private report: IntegrityReport | null = null
  private auditTask: Promise<unknown> = Promise.resolve()
  private lastPrepared: PreparedGame | null = null
  private readonly arguments: ArgumentBuilder
  private readonly media = new Set<string>()
  private readonly links = new Set<string>()

  constructor(
    private readonly metadata: MetadataClient,
    private readonly installer: GameInstaller,
    private readonly launcher: GameLauncher,
    argumentsB: ArgumentBuilder,
    private readonly settings: SettingsStore,
    private readonly emitProgress: (progress: InstallProgress) => void,
    private readonly emitState: (state: GameState) => void
  ) {
    this.arguments = argumentsB
  }

  static create(paths: AppPaths, emitProgress: (progress: InstallProgress) => void, emitState: (state: GameState) => void): GameService {
    const userAgent = `${appConfig.name}/${appConfig.version}`
    const platform = Platform.current()
    const evaluator = new RuleEvaluator(platform)
    const packHosts = [...appConfig.content.downloadHosts, new URL(appConfig.content.metadataUrl).hostname]
    const downloader = new Downloader(new Set([...MOJANG_HOSTS, ...LOADER_HOSTS, ...packHosts]), userAgent, 8)
    const metadata = new MetadataClient(
      appConfig.content.metadataUrl,
      paths.metadataCacheFile,
      new MetadataParser(packHosts, appConfig.public.allowedLinkHosts),
      userAgent
    )
    const installer = new GameInstaller(
      paths,
      downloader,
      new VersionRepository(paths, downloader),
      new JavaRuntimeManager(paths, downloader, platform, appConfig.game.runtimeIndexUrl),
      new LoaderInstaller(paths, downloader),
      new LibraryPlanner(paths, evaluator, downloader),
      new AssetManager(paths, downloader),
      new PackSynchronizer(downloader)
    )
    const argumentsB = new ArgumentBuilder(evaluator, platform)
    const launcher = new GameLauncher(argumentsB, platform)
    return new GameService(metadata, installer, launcher, argumentsB, new SettingsStore(paths.settingsFile), emitProgress, emitState)
  }

  getState(): GameState {
    return this.state
  }

  isKnownLink(url: string): boolean {
    return this.links.has(url)
  }

  async summary(): Promise<MetadataSummary> {
    const loaded = await this.metadata.load()
    this.remember(loaded.metadata)
    return {
      contentVersion: loaded.metadata.contentVersion,
      news: loaded.metadata.news,
      links: loaded.metadata.links,
      shop: loaded.metadata.shop,
      pack: GameService.summarize(loaded.metadata.pack),
      fromCache: loaded.fromCache,
      signatureVerified: true,
      issuedAt: loaded.issuedAt,
      expiresAt: loaded.expiresAt
    }
  }

  async settingsView(): Promise<SettingsView> {
    const settings = await this.settings.load()
    const view = this.settings.view(settings)
    const jvm: readonly JvmArgument[] = this.lastPrepared ? this.arguments.preview(this.lastPrepared, settings) : []
    return { ...view, jvm }
  }

  async saveSettings(patch: unknown): Promise<SettingsView> {
    return this.settings.view(await this.settings.save(patch))
  }

  async prepare(repair: boolean): Promise<PackSummary> {
    await this.auditTask.catch(() => undefined)
    this.enter('installing')
    try {
      const prepared = await this.install(repair)
      this.lastPrepared = prepared
      return GameService.summarize(prepared.pack)
    } finally {
      this.update({ phase: 'idle', pid: null })
    }
  }

  async play(sessions: SessionSource, repair: boolean): Promise<GameState> {
    if (!sessions.hasActiveAccount()) throw new AuthError('session_expired', 'Sign in before playing.')
    await this.auditTask.catch(() => undefined)
    this.enter('installing')
    try {
      const prepared = await this.install(repair)
      this.lastPrepared = prepared
      this.update({ phase: 'launching' })
      const session = await sessions.createSession()
      const settings: GameSettings = await this.settings.load()
      const running = await this.launcher.launch(session, prepared, settings, (code) => this.update({ phase: 'idle', pid: null, exitCode: code }))
      this.update({ phase: 'running', pid: running.pid, exitCode: null })
      return this.state
    } catch (error) {
      this.update({ phase: 'idle', pid: null })
      throw error
    }
  }

  stop(): boolean {
    return this.launcher.stop()
  }

  currentPackId(): string | null {
    return this.packId
  }

  isKnownMedia(url: string): boolean {
    return this.media.has(url)
  }

  audit(): Promise<IntegrityReport | null> {
    if (this.state.phase !== 'idle') return Promise.resolve(this.report)
    const task = (async (): Promise<IntegrityReport | null> => {
      const { metadata } = await this.metadata.load()
      this.remember(metadata)
      this.report = await this.installer.audit(metadata.pack)
      return this.report
    })()
    this.auditTask = task
    return task
  }

  private remember(metadata: LauncherMetadata): void {
    this.links.clear()
    this.media.clear()
    this.packId = metadata.pack.id
    for (const link of metadata.links) this.links.add(link.url)
    for (const item of metadata.news) {
      if (item.url) this.links.add(item.url)
      if (item.coverImage) this.media.add(item.coverImage)
      for (const url of GameService.markdownLinks(item.markdown)) this.links.add(url)
    }
    for (const item of metadata.shop) {
      this.links.add(item.url)
      for (const image of item.images) this.media.add(image)
      for (const url of GameService.markdownLinks(item.descriptionMarkdown)) this.links.add(url)
    }
  }

  private static markdownLinks(markdown: string): readonly string[] {
    const result = new Set<string>()
    const pattern = /\[[^\]]+\]\((https:\/\/[^)\s]+)\)/g
    for (const match of markdown.matchAll(pattern)) {
      const url = match[1]
      if (url) result.add(url)
    }
    return [...result]
  }

  private async install(repair: boolean): Promise<PreparedGame> {
    const reporter = new ProgressReporter(this.emitProgress)
    reporter.begin('metadata', 'Checking for updates', 1)
    const loaded = await this.metadata.load()
    const metadata = loaded.metadata
    this.remember(metadata)
    reporter.advance()
    return this.installer.install(metadata.pack, repair ? 'full' : 'quick', reporter)
  }

  private enter(phase: GamePhase): void {
    if (this.state.phase !== 'idle') throw new GameError('busy', 'The launcher is already installing or running the game.')
    this.update({ phase, pid: null, exitCode: null })
  }

  private update(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch }
    this.emitState(this.state)
  }

  private static summarize(pack: PackManifest): PackSummary {
    return {
      id: pack.id,
      name: pack.name,
      version: pack.version,
      releaseDate: pack.releaseDate,
      minecraft: pack.minecraft,
      loader: pack.loader.type,
      loaderVersion: pack.loader.version,
      fileCount: pack.files.length
    }
  }
}