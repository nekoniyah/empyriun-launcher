import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { IntegrityReport, ModStatus } from '../../../shared/integrity'
import type { PackFile, PackManifest } from '../content/metadata-types'
import { hashFile } from '../core/hash'
import { mapPool } from '../core/pool'
import { resolveInside } from '../core/safe-path'
import type { Downloader } from './downloader'
import type { ProgressReporter } from './progress-reporter'

interface Verified {
  readonly sha512: string
  readonly size: number
  readonly mtime: number
}

interface InstalledState {
  files: string[]
  verified: Record<string, Verified>
}

export class PackSynchronizer {
  constructor(private readonly downloader: Downloader) {}

  async sync(pack: PackManifest, instanceDir: string, reporter: ProgressReporter): Promise<void> {
    const state = await PackSynchronizer.readState(instanceDir)
    reporter.begin('pack', `${pack.name} ${pack.version}`, Math.max(1, pack.files.length))
    await mkdir(instanceDir, { recursive: true })
    await mapPool(pack.files, 8, async (file) => {
      const destination = resolveInside(instanceDir, file.path)
      const keep = file.policy === 'once' && (await Bun.file(destination).exists())
      if (!keep) {
        await this.downloader.ensure({ url: file.url, destination, size: file.size, sha512: file.sha512 }, 'full')
        const info = await stat(destination)
        state.verified[file.path] = { sha512: file.sha512, size: info.size, mtime: info.mtimeMs }
      }
      reporter.advance()
    })
    if (pack.files.length === 0) reporter.advance()
    await PackSynchronizer.removeStale(instanceDir, state, pack)
    await PackSynchronizer.disableUnauthorized(instanceDir, PackSynchronizer.wanted(pack))
    await PackSynchronizer.writeState(instanceDir, state, pack)
  }

  async audit(pack: PackManifest, instanceDir: string): Promise<IntegrityReport | null> {
    if (!(await stat(instanceDir).catch(() => null))) return null
    const state = await PackSynchronizer.readState(instanceDir)
    const files = await mapPool(pack.files, 8, (file) => PackSynchronizer.inspect(instanceDir, state, file))
    const removed = await PackSynchronizer.removeStale(instanceDir, state, pack)
    const disabled = await PackSynchronizer.disableUnauthorized(instanceDir, PackSynchronizer.wanted(pack))
    await PackSynchronizer.writeState(instanceDir, state, pack)
    return { checkedAt: Date.now(), files, disabled, removed }
  }

  private static wanted(pack: PackManifest): ReadonlySet<string> {
    return new Set(pack.files.map((file) => file.path.toLowerCase()))
  }

  private static async inspect(instanceDir: string, state: InstalledState, file: PackFile): Promise<ModStatus> {
    const info = await stat(resolveInside(instanceDir, file.path)).catch(() => null)
    if (!info?.isFile()) return { path: file.path, state: 'missing' }
    if (file.policy === 'once') return { path: file.path, state: 'ok' }
    if (info.size !== file.size) return { path: file.path, state: 'corrupt' }
    const cached = state.verified[file.path]
    if (cached && cached.sha512 === file.sha512 && cached.size === info.size && cached.mtime === info.mtimeMs) return { path: file.path, state: 'ok' }
    if ((await hashFile(resolveInside(instanceDir, file.path), 'sha512')) !== file.sha512) return { path: file.path, state: 'corrupt' }
    state.verified[file.path] = { sha512: file.sha512, size: info.size, mtime: info.mtimeMs }
    return { path: file.path, state: 'ok' }
  }

  private static async removeStale(instanceDir: string, state: InstalledState, pack: PackManifest): Promise<string[]> {
    const wanted = PackSynchronizer.wanted(pack)
    const removed: string[] = []
    for (const path of state.files) {
      if (wanted.has(path.toLowerCase())) continue
      try {
        await rm(resolveInside(instanceDir, path), { force: true })
        removed.push(path)
      } catch {
        continue
      }
      delete state.verified[path]
    }
    return removed
  }

  private static async disableUnauthorized(instanceDir: string, wanted: ReadonlySet<string>): Promise<string[]> {
    const disabled: string[] = []
    const entries = await readdir(join(instanceDir, 'mods'), { recursive: true, withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isFile() || !/\.jar$/i.test(entry.name)) continue
      const full = join(entry.parentPath, entry.name)
      const path = relative(instanceDir, full).split(sep).join('/')
      if (wanted.has(path.toLowerCase())) continue
      await rm(`${full}.disabled`, { force: true })
      await rename(full, `${full}.disabled`)
      disabled.push(path)
    }
    return disabled
  }

  private static async readState(instanceDir: string): Promise<InstalledState> {
    try {
      const parsed = JSON.parse(await Bun.file(join(instanceDir, '.launcher', 'installed.json')).text()) as { files?: unknown; verified?: unknown }
      const files = Array.isArray(parsed.files) ? parsed.files.filter((entry): entry is string => typeof entry === 'string') : []
      const verified = typeof parsed.verified === 'object' && parsed.verified !== null ? (parsed.verified as Record<string, Verified>) : {}
      return { files, verified }
    } catch {
      return { files: [], verified: {} }
    }
  }

  private static async writeState(instanceDir: string, state: InstalledState, pack: PackManifest): Promise<void> {
    const wanted = PackSynchronizer.wanted(pack)
    const verified: Record<string, Verified> = {}
    for (const [path, value] of Object.entries(state.verified)) if (wanted.has(path.toLowerCase())) verified[path] = value
    await mkdir(join(instanceDir, '.launcher'), { recursive: true })
    await Bun.write(join(instanceDir, '.launcher', 'installed.json'), JSON.stringify({ files: pack.files.map((file) => file.path), verified }))
  }
}