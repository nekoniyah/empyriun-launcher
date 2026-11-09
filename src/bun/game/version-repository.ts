import { join } from 'node:path'
import { GameError } from '../core/game-error'
import type { AppPaths } from '../core/paths'
import type { Downloader, VerifyMode } from './downloader'
import { ProfileResolver, type VersionJson } from './version-profile'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

export class VersionRepository {
  constructor(private readonly paths: AppPaths, private readonly downloader: Downloader) { }

  async ensure(id: string, mode: VerifyMode): Promise<VersionJson> {
    const destination = join(this.paths.versionsDir, id, `${id}.json`)
    if (mode === 'quick') {
      const existing = await ProfileResolver.readFile(destination)
      if (existing?.id === id) return existing
    }
    const manifest = JSON.parse(await this.downloader.text(MANIFEST_URL)) as { versions?: { id: string; url: string; sha1: string }[] }
    const entry = manifest.versions?.find((version) => version.id === id)
    if (!entry) throw new GameError('unsupported_version', `Minecraft ${id} is not in Mojang's version list.`)
    await this.downloader.ensure({ url: entry.url, destination, sha1: entry.sha1 }, 'full')
    const parsed = await ProfileResolver.readFile(destination)
    if (!parsed) throw new GameError('unsupported_version', `The version file for ${id} could not be read.`)
    return parsed
  }
}