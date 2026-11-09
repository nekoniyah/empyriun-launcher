import { mkdir, rm, symlink } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { GameError } from '../core/game-error'
import type { AppPaths } from '../core/paths'
import type { Platform } from '../core/platform'
import { resolveInside } from '../core/safe-path'
import type { DownloadTask, Downloader, VerifyMode } from './downloader'
import type { ProgressReporter } from './progress-reporter'

interface RuntimeFile {
  readonly type: 'file' | 'directory' | 'link'
  readonly executable?: boolean
  readonly target?: string
  readonly downloads?: { readonly raw?: { readonly url: string; readonly sha1: string; readonly size: number } }
}

type RuntimeIndex = Record<string, Record<string, { manifest: { sha1: string; url: string } }[]>>

export interface JavaRuntime {
  readonly home: string
  readonly java: string
  readonly gui: string
}

export class JavaRuntimeManager {
  constructor(private readonly paths: AppPaths, private readonly downloader: Downloader, private readonly platform: Platform, private readonly indexUrl: string) { }

  async ensure(component: string, mode: VerifyMode, reporter: ProgressReporter): Promise<JavaRuntime> {
    const root = join(this.paths.runtimeDir, component, this.platform.javaRuntimeKey)
    const marker = join(root, '.installed')
    if (mode === 'quick' && (await Bun.file(marker).exists())) {
      reporter.begin('java', `Java runtime ${component}`, 1)
      reporter.advance()
      return this.locate(root)
    }
    await this.install(component, root, mode, reporter)
    await Bun.write(marker, new Date().toISOString())
    return this.locate(root)
  }

  private async install(component: string, root: string, mode: VerifyMode, reporter: ProgressReporter): Promise<void> {
    const index = JSON.parse(await this.downloader.text(this.indexUrl)) as RuntimeIndex
    const entry = index[this.platform.javaRuntimeKey]?.[component]?.[0]
    if (!entry) throw new GameError('java_unavailable', `Mojang's runtime index has no ${component} for ${this.platform.javaRuntimeKey}.`)
    const manifestText = await this.downloader.text(entry.manifest.url)
    if (new Bun.CryptoHasher('sha1').update(manifestText).digest('hex') !== entry.manifest.sha1.toLowerCase()) throw new GameError('integrity_failed', 'The Java runtime manifest failed its checksum.')
    const files = (JSON.parse(manifestText) as { files?: Record<string, RuntimeFile> }).files ?? {}
    const tasks: DownloadTask[] = []
    const links: { link: string; target: string }[] = []
    for (const [path, file] of Object.entries(files)) {
      const destination = resolveInside(root, path)
      if (file.type === 'directory') await mkdir(destination, { recursive: true })
      else if (file.type === 'link' && file.target) links.push({ link: destination, target: file.target })
      else if (file.type === 'file') {
        const raw = file.downloads?.raw
        if (!raw) throw new GameError('java_unavailable', `The runtime manifest lists ${path} without a download.`)
        tasks.push({ url: raw.url, destination, size: raw.size, sha1: raw.sha1, executable: file.executable })
      }
    }
    reporter.begin('java', `Java runtime ${component}`, tasks.length)
    await this.downloader.ensureAll(tasks, mode, () => reporter.advance())
    await this.createLinks(root, links)
  }

  private async createLinks(root: string, links: readonly { link: string; target: string }[]): Promise<void> {
    if (this.platform.os === 'windows') return
    const base = resolve(root)
    for (const { link, target } of links) {
      if (!resolve(dirname(link), target).startsWith(`${base}${sep}`)) throw new GameError('unsafe_path', 'A runtime link points outside the runtime folder.')
      await mkdir(dirname(link), { recursive: true })
      await rm(link, { force: true })
      await symlink(target, link)
    }
  }

  private async locate(root: string): Promise<JavaRuntime> {
    const home = this.platform.os === 'osx' ? join(root, 'jre.bundle', 'Contents', 'Home') : root
    const java = join(home, 'bin', this.platform.os === 'windows' ? 'java.exe' : 'java')
    const gui = this.platform.os === 'windows' ? join(home, 'bin', 'javaw.exe') : java
    if (!(await Bun.file(java).exists())) throw new GameError('java_unavailable', 'The Java runtime was installed but its executable is missing.')
    return { home, java, gui }
  }
}