import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import type { LogChunk, LogFile, LogGroup, LogMatch } from '../../../shared/logs'
import { GameError } from '../core/game-error'
import { redactSecrets } from '../crash-log'

const INITIAL_TAIL = 192 * 1024
const MAX_CHUNK = 256 * 1024
const MAX_ARCHIVE = 4 * 1024 * 1024
const SEARCH_TAIL = 2 * 1024 * 1024
const MAX_ENTRIES = 20
const MAX_RESULTS = 30
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/
const GAME_FILES: readonly string[] = ['latest.log', 'launcher-stderr.log', 'launcher-stdout.log', 'debug.log']

interface Resolved {
  readonly path: string
  readonly archived: boolean
}

export class LogService {
  constructor(
    private readonly launcherLog: string,
    private readonly instanceDir: () => string | null,
    private readonly gameRunning: () => boolean
  ) {}

  async list(): Promise<LogFile[]> {
    const files: LogFile[] = []
    await this.add(files, 'launcher', 'launcher', 'launcher', this.launcherLog)
    const instance = this.instanceDir()
    if (!instance) return files
    const logs = join(instance, 'logs')
    const crashes = join(instance, 'crash-reports')
    for (const name of GAME_FILES) await this.add(files, `game:${name}`, 'game', name, join(logs, name))
    for (const name of await this.recent(crashes, /\.txt$/i)) await this.add(files, `crash:${name}`, 'crash', name, join(crashes, name))
    for (const name of await this.recent(logs, /\.log\.gz$/i)) await this.add(files, `archive:${name}`, 'archive', name, join(logs, name))
    return files
  }

  async read(id: string, offset: number): Promise<LogChunk> {
    const { path, archived } = this.resolve(id)
    const file = Bun.file(path)
    if (!(await file.exists())) return { text: '', next: 0, size: 0, reset: true }
    if (archived) return this.readArchive(path, offset)
    const size = file.size
    const reset = !Number.isFinite(offset) || offset <= 0 || offset > size
    const start = reset ? Math.max(0, size - INITIAL_TAIL) : offset
    const end = Math.min(size, start + MAX_CHUNK)
    let text = new TextDecoder().decode(await file.slice(start, end).arrayBuffer())
    if (reset && start > 0) text = text.slice(text.indexOf('\n') + 1)
    return { text: redactSecrets(text), next: end, size, reset }
  }

  async delete(id: string): Promise<boolean> {
    const { path } = this.resolve(id)
    if (id.startsWith('game:') && this.gameRunning()) throw new GameError('busy', 'This log is in use while the game is running.')
    await rm(path, { force: true })
    return true
  }

  async clear(group: LogGroup): Promise<number> {
    let removed = 0
    for (const file of (await this.list()).filter((entry) => entry.group === group)) {
      try {
        await this.delete(file.id)
        removed += 1
      } catch {
        continue
      }
    }
    return removed
  }

  async search(query: string): Promise<LogMatch[]> {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2 || needle.length > 80) return []
    const matches: LogMatch[] = []
    for (const file of await this.list()) {
      let count = 0
      const samples: string[] = []
      for (const line of (await this.content(file.id)).split('\n')) {
        if (!line.toLowerCase().includes(needle)) continue
        count += 1
        if (samples.length < 3) samples.push(line.trim().slice(0, 180))
      }
      if (count > 0) matches.push({ id: file.id, label: file.label, group: file.group, count, samples })
    }
    return matches.sort((left, right) => right.count - left.count).slice(0, MAX_RESULTS)
  }

  private async content(id: string): Promise<string> {
    const { path, archived } = this.resolve(id)
    const file = Bun.file(path)
    if (!(await file.exists())) return ''
    try {
      if (archived) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const decoded = path.endsWith('.gz') ? gunzipSync(bytes, { maxOutputLength: MAX_ARCHIVE }) : bytes.subarray(0, MAX_ARCHIVE)
        return redactSecrets(new TextDecoder().decode(decoded))
      }
      return redactSecrets(new TextDecoder().decode(await file.slice(Math.max(0, file.size - SEARCH_TAIL), file.size).arrayBuffer()))
    } catch {
      return ''
    }
  }

  private async readArchive(path: string, offset: number): Promise<LogChunk> {
    if (offset > 0) return { text: '', next: offset, size: offset, reset: false }
    const bytes = new Uint8Array(await Bun.file(path).arrayBuffer())
    let decoded: Uint8Array
    try {
      decoded = path.endsWith('.gz') ? gunzipSync(bytes, { maxOutputLength: MAX_ARCHIVE }) : bytes.subarray(0, MAX_ARCHIVE)
    } catch (cause) {
      throw new GameError('integrity_failed', 'This log could not be read.', { cause })
    }
    const text = redactSecrets(new TextDecoder().decode(decoded))
    return { text, next: Math.max(1, text.length), size: Math.max(1, text.length), reset: true }
  }

  private resolve(id: string): Resolved {
    if (id === 'launcher') return { path: this.launcherLog, archived: false }
    const [kind, name] = id.split(':')
    const instance = this.instanceDir()
    if (!kind || !name || !instance || !NAME_PATTERN.test(name)) throw new GameError('unsafe_path', 'Unknown log.')
    if (kind === 'game' && GAME_FILES.includes(name)) return { path: join(instance, 'logs', name), archived: false }
    if (kind === 'archive' && name.endsWith('.log.gz')) return { path: join(instance, 'logs', name), archived: true }
    if (kind === 'crash' && name.endsWith('.txt')) return { path: join(instance, 'crash-reports', name), archived: true }
    throw new GameError('unsafe_path', 'Unknown log.')
  }

  private async add(files: LogFile[], id: string, group: LogGroup, label: string, path: string): Promise<void> {
    const info = await stat(path).catch(() => null)
    if (info?.isFile()) files.push({ id, label, group, size: info.size, modified: info.mtimeMs })
  }

  private async recent(directory: string, pattern: RegExp): Promise<string[]> {
    const names = (await readdir(directory).catch(() => [] as string[])).filter((name) => pattern.test(name) && NAME_PATTERN.test(name))
    const dated = await Promise.all(names.map(async (name) => ({ name, time: (await stat(join(directory, name)).catch(() => null))?.mtimeMs ?? 0 })))
    return dated.sort((left, right) => right.time - left.time).slice(0, MAX_ENTRIES).map((entry) => entry.name)
  }
}