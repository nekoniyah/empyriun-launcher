import { chmod, mkdir, rename, rm, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { GameError } from '../core/game-error'
import { hashFile } from '../core/hash'
import { mapPool } from '../core/pool'

export type VerifyMode = 'quick' | 'full'

export interface DownloadTask {
  readonly url: string
  readonly destination: string
  readonly size?: number | undefined
  readonly sha1?: string | undefined
  readonly sha512?: string | undefined
  readonly executable?: boolean | undefined
}

const ATTEMPTS = 4
const MAX_REDIRECTS = 3
const REQUEST_TIMEOUT_MS = 300_000
const BUFFER_LIMIT = 16 * 1024 * 1024

export class Downloader {
  constructor(private readonly hosts: ReadonlySet<string>, private readonly userAgent: string, private readonly concurrency: number = 8) { }

  async ensure(task: DownloadTask, mode: VerifyMode): Promise<boolean> {
    if (await this.isValid(task, mode)) return false
    await this.download(task)
    return true
  }

  async ensureAll(tasks: readonly DownloadTask[], mode: VerifyMode, onEach?: () => void): Promise<void> {
    await mapPool(tasks, this.concurrency, async (task) => {
      await this.ensure(task, mode)
      onEach?.()
    })
  }

  async text(url: string): Promise<string> {
    return (await this.open(url)).text()
  }

  private async isValid(task: DownloadTask, mode: VerifyMode): Promise<boolean> {
    const info = await stat(task.destination).catch(() => null)
    if (!info?.isFile()) return false
    if (task.size !== undefined && info.size !== task.size) return false
    const expected = task.sha512 ?? task.sha1
    if (mode === 'full' && expected) return (await hashFile(task.destination, task.sha512 ? 'sha512' : 'sha1')) === expected.toLowerCase()
    return true
  }

  private async download(task: DownloadTask): Promise<void> {
    let lastError: unknown
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      try {
        await this.fetchToFile(task)
        return
      } catch (error) {
        lastError = error
        console.error(`Download attempt ${attempt}/${ATTEMPTS} failed for ${task.url}`, error)
        await new Promise((resolve) => setTimeout(resolve, attempt * 700))
      }
    }
    if (lastError instanceof GameError) throw lastError
    const target = new URL(task.url)
    const reason = lastError instanceof Error ? lastError.message : String(lastError)
    throw new GameError('download_failed', `Download failed: ${target.hostname}${target.pathname} (${reason.slice(0, 160)})`, { cause: lastError })
  }

  private async fetchToFile(task: DownloadTask): Promise<void> {
    const response = await this.open(task.url)
    await mkdir(dirname(task.destination), { recursive: true })
    const partial = `${task.destination}.part`
    const algorithm = task.sha512 ? 'sha512' : task.sha1 ? 'sha1' : null
    const hasher = algorithm ? new Bun.CryptoHasher(algorithm) : null
    try {
      const buffered = task.size !== undefined && task.size <= BUFFER_LIMIT
      const written = buffered ? await this.writeBuffered(response, partial, hasher) : await this.writeStreamed(response, partial, hasher)
      const expected = (task.sha512 ?? task.sha1)?.toLowerCase()
      if ((task.size !== undefined && written !== task.size) || (hasher && expected && hasher.digest('hex') !== expected)) throw new GameError('integrity_failed', `Integrity check failed: ${new URL(task.url).pathname.split('/').pop() ?? task.url}`)
      await rename(partial, task.destination)
    } catch (error) {
      await rm(partial, { force: true })
      throw error
    }
    if (task.executable && process.platform !== 'win32') await chmod(task.destination, 0o755)
  }

  private async writeBuffered(response: Response, partial: string, hasher: Bun.CryptoHasher | null): Promise<number> {
    const bytes = new Uint8Array(await response.arrayBuffer())
    hasher?.update(bytes)
    await Bun.write(partial, bytes)
    return bytes.byteLength
  }

  private async writeStreamed(response: Response, partial: string, hasher: Bun.CryptoHasher | null): Promise<number> {
    if (!response.body) throw new GameError('download_failed', 'The server sent an empty response.')
    const reader = response.body.getReader()
    const sink = Bun.file(partial).writer()
    let written = 0
    try {
      for (; ;) {
        const { done, value } = await reader.read()
        if (done) break
        sink.write(value)
        hasher?.update(value)
        written += value.byteLength
      }
      await sink.end()
    } catch (error) {
      await reader.cancel().catch(() => undefined)
      await Promise.resolve(sink.end()).catch(() => 0)
      throw error
    }
    return written
  }

  private async open(url: string): Promise<Response> {
    let current = url
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const target = this.validate(current)
      const response = await fetch(target, { headers: { 'User-Agent': this.userAgent }, redirect: 'manual', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new GameError('download_failed', 'A redirect had no destination.')
        current = new URL(location, target).href
        continue
      }
      if (!response.ok) throw new GameError('download_failed', `HTTP ${response.status} from ${target.hostname}${target.pathname}`)
      return response
    }
    throw new GameError('download_failed', 'Too many redirects.')
  }

  private validate(url: string): URL {
    let target: URL
    try {
      target = new URL(url)
    } catch (cause) {
      throw new GameError('download_failed', 'Invalid download address.', { cause })
    }
    if (target.protocol !== 'https:' || !this.hosts.has(target.hostname)) throw new GameError('download_failed', `Blocked download host: ${target.hostname}`)
    return target
  }
}