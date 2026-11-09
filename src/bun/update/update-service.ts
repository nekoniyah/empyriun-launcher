import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Updater } from 'electrobun/bun'
import appConfig from '../../../app.config'
import type { UpdateState } from '../../../shared/update'

const CHECK_INTERVAL_MS = 20 * 60 * 1000
const FIRST_CHECK_DELAY_MS = 5000
const BOOT_CHECK_TIMEOUT_MS = 15000
const BOOT_DOWNLOAD_TIMEOUT_MS = 45000

interface Staged { readonly hash: string, readonly version: string }

function withTimeout<T>(task: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    task.then((value) => { clearTimeout(timer); resolve(value) }, (error) => { clearTimeout(timer); reject(error) })
  })
}

async function readStaged(file: string): Promise<Staged | null> {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<Staged>
    return typeof parsed.hash === 'string' && typeof parsed.version === 'string' ? { hash: parsed.hash, version: parsed.version } : null
  } catch {
    return null
  }
}

export interface BootHooks {
  readonly before: () => void
  readonly restore: () => Promise<unknown>
}

export class UpdateService {
  private state: UpdateState = { status: 'idle', currentVersion: appConfig.version, latestVersion: null, progress: null, message: null }
  private timer: ReturnType<typeof setInterval> | null = null
  private busy = false

  constructor(private readonly stagedFile: string, private readonly gameActive: () => boolean, private readonly emit: (state: UpdateState) => void) {
    Updater.onStatusChange((entry) => {
      const progress = entry.details?.progress
      if (entry.status === 'download-progress' && typeof progress === 'number') this.patch({ progress: Math.min(1, Math.max(0, progress / 100)) })
    })
  }

  snapshot(): UpdateState { return this.state }

  start(): void {
    setTimeout(() => void this.cycle(), FIRST_CHECK_DELAY_MS)
    this.timer = setInterval(() => void this.cycle(), CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  poke(): void { void this.cycle() }

  static async applyStaged(stagedFile: string, hooks: BootHooks): Promise<void> {
    const staged = await readStaged(stagedFile)
    if (!staged) return
    let released = false
    try {
      const info = await withTimeout(Updater.checkForUpdate(), BOOT_CHECK_TIMEOUT_MS, 'Update check')
      if (!info.updateAvailable || info.hash !== staged.hash) { await rm(stagedFile, { force: true }); return }
      await withTimeout(Updater.downloadUpdate(), BOOT_DOWNLOAD_TIMEOUT_MS, 'Update download')
      await rm(stagedFile, { force: true })
      hooks.before()
      released = true
      await Updater.applyUpdate()
    } catch (error) {
      console.error('Applying the staged update failed, starting normally', error)
      if (released) await hooks.restore()
    }
  }

  private async cycle(): Promise<void> {
    if (this.busy) return
    this.busy = true
    try {
      if (this.state.status !== 'ready') this.patch({ status: 'checking', message: null })
      const info = await Updater.checkForUpdate()
      if (info.error) throw new Error(info.error)
      if (!info.updateAvailable) {
        await rm(this.stagedFile, { force: true })
        this.patch({ status: 'idle', latestVersion: null, progress: null })
        return
      }
      const staged = await readStaged(this.stagedFile)
      if (staged && staged.hash === info.hash) { this.patch({ status: 'ready', latestVersion: info.version, progress: 1 }); return }
      if (this.gameActive()) { this.patch({ status: 'available', latestVersion: info.version, progress: null }); return }
      this.patch({ status: 'downloading', latestVersion: info.version, progress: 0 })
      await Updater.downloadUpdate()
      await mkdir(dirname(this.stagedFile), { recursive: true })
      await writeFile(this.stagedFile, JSON.stringify({ hash: info.hash, version: info.version }))
      this.patch({ status: 'ready', latestVersion: info.version, progress: 1 })
    } catch (error) {
      console.error('Update check failed', error)
      this.patch({ status: this.state.latestVersion ? 'available' : 'error', message: error instanceof Error ? error.message : 'Update failed' })
    } finally {
      this.busy = false
    }
  }

  private patch(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial }
    this.emit(this.state)
  }
}