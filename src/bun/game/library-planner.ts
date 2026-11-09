import { join } from 'node:path'
import { GameError } from '../core/game-error'
import type { AppPaths } from '../core/paths'
import { resolveInside } from '../core/safe-path'
import type { DownloadTask, Downloader } from './downloader'
import type { LibraryEntry } from './version-profile'
import type { RuleEvaluator } from './rules'

const DEFAULT_MAVEN = 'https://libraries.minecraft.net/'

export interface LibraryPlan {
  readonly downloads: readonly DownloadTask[]
  readonly classpath: readonly string[]
  readonly provided: readonly string[]
}

export function mavenPath(coordinate: string): string {
  const [main, extension = 'jar'] = coordinate.split('@')
  const [group, artifact, version, classifier] = (main ?? '').split(':')
  if (!group || !artifact || !version) throw new GameError('unsupported_version', `Invalid library name: ${coordinate}`)
  const file = `${artifact}-${version}${classifier ? `-${classifier}` : ''}.${extension}`
  return `${group.replaceAll('.', '/')}/${artifact}/${version}/${file}`
}

export class LibraryPlanner {
  private readonly root: string

  constructor(paths: AppPaths, private readonly rules: RuleEvaluator, private readonly downloader: Downloader) {
    this.root = paths.librariesDir
  }

  async plan(libraries: readonly LibraryEntry[]): Promise<LibraryPlan> {
    const downloads: DownloadTask[] = []
    const classpath: string[] = []
    const provided: string[] = []
    const seen = new Set<string>()
    for (const library of libraries) {
      if (!this.rules.allows(library.rules)) continue
      if (library.natives) throw new GameError('unsupported_version', 'This version uses the legacy natives format. Minecraft 1.19 or newer is required.')
      const artifact = library.downloads?.artifact
      const path = artifact?.path ?? mavenPath(library.name)
      const destination = resolveInside(this.root, path)
      if (seen.has(destination)) continue
      seen.add(destination)
      classpath.push(destination)
      if (artifact) {
        if (artifact.url) downloads.push({ url: artifact.url, destination, size: artifact.size, sha1: artifact.sha1 })
        else provided.push(destination)
        continue
      }
      if (await Bun.file(destination).exists()) continue
      const base = library.url ?? DEFAULT_MAVEN
      const url = `${base.endsWith('/') ? base : `${base}/`}${path}`
      downloads.push({ url, destination, sha1: await this.checksum(url) })
    }
    return { downloads, classpath, provided }
  }

  private async checksum(url: string): Promise<string> {
    const match = /^[0-9a-f]{40}/i.exec((await this.downloader.text(`${url}.sha1`)).trim())
    if (!match) throw new GameError('integrity_failed', `No usable checksum for ${join(...url.split('/').slice(-1))}`)
    return match[0].toLowerCase()
  }
}