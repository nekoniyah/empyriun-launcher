import { join } from 'node:path'
import { GameError } from '../core/game-error'
import type { AppPaths } from '../core/paths'
import type { DownloadTask, Downloader, VerifyMode } from './downloader'
import type { ProgressReporter } from './progress-reporter'
import type { AssetIndexRef } from './version-profile'

const ASSET_HOST = 'https://resources.download.minecraft.net'
const HASH_PATTERN = /^[0-9a-f]{40}$/

interface AssetIndex {
  readonly objects?: Readonly<Record<string, { readonly hash: string; readonly size: number }>>
  readonly map_to_resources?: boolean
  readonly virtual?: boolean
}

export class AssetManager {
  constructor(private readonly paths: AppPaths, private readonly downloader: Downloader) { }

  async ensure(ref: AssetIndexRef, mode: VerifyMode, reporter: ProgressReporter): Promise<void> {
    const indexFile = join(this.paths.assetsDir, 'indexes', `${ref.id}.json`)
    await this.downloader.ensure({ url: ref.url, destination: indexFile, size: ref.size, sha1: ref.sha1 }, mode)
    const index = JSON.parse(await Bun.file(indexFile).text()) as AssetIndex
    if (index.map_to_resources || index.virtual) throw new GameError('unsupported_version', 'Legacy virtual assets are not supported.')
    const unique = new Map<string, number>()
    for (const object of Object.values(index.objects ?? {})) {
      if (!HASH_PATTERN.test(object.hash) || !Number.isInteger(object.size)) throw new GameError('integrity_failed', 'The asset index contains an invalid entry.')
      unique.set(object.hash, object.size)
    }
    const tasks: DownloadTask[] = [...unique].map(([hash, size]) => ({
      url: `${ASSET_HOST}/${hash.slice(0, 2)}/${hash}`,
      destination: join(this.paths.assetsDir, 'objects', hash.slice(0, 2), hash),
      size,
      sha1: hash
    }))
    reporter.begin('assets', 'Game assets', tasks.length)
    await this.downloader.ensureAll(tasks, mode, () => reporter.advance())
  }
}