import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { cleanJavaEnvironment } from '../core/environment'
import { GameError } from '../core/game-error'
import type { AppPaths } from '../core/paths'
import type { PackManifest } from '../content/metadata-types'
import type { Downloader, VerifyMode } from './downloader'
import type { JavaRuntime } from './java-runtime'
import { ProfileResolver, type VersionJson } from './version-profile'

const INSTALLER_TIMEOUT_MS = 15 * 60 * 1000

export class LoaderInstaller {
  constructor(
    private readonly paths: AppPaths,
    private readonly downloader: Downloader
  ) { }

  async ensure(pack: PackManifest, runtime: JavaRuntime, mode: VerifyMode): Promise<VersionJson | null> {
    const { type, version } = pack.loader
    const minecraft = encodeURIComponent(pack.minecraft)
    const loader = encodeURIComponent(version)
    switch (type) {
      case 'vanilla': return null
      case 'fabric': return this.fromProfile(`https://meta.fabricmc.net/v2/versions/loader/${minecraft}/${loader}/profile/json`, `fabric-loader-${version}-${pack.minecraft}`)
      case 'quilt': return this.fromProfile(`https://meta.quiltmc.org/v3/versions/loader/${minecraft}/${loader}/profile/json`, `quilt-loader-${version}-${pack.minecraft}`)
      case 'neoforge': return this.fromInstaller(pack, runtime, mode, `neoforge-${version}`)
      case 'forge': return this.fromInstaller(pack, runtime, mode, `${pack.minecraft}-forge-${version}`)
    }
  }

  private versionFile(id: string): string {
    return join(this.paths.versionsDir, id, `${id}.json`)
  }

  private async fromProfile(url: string, id: string): Promise<VersionJson> {
    const destination = this.versionFile(id)
    const existing = await ProfileResolver.readFile(destination)
    if (existing?.id === id) return existing
    let profile: VersionJson
    let text: string
    try {
      text = await this.downloader.text(url)
      profile = ProfileResolver.parse(JSON.parse(text))
    } catch (cause) {
      throw new GameError('loader_failed', 'The loader metadata could not be downloaded for this Minecraft and loader version.', { cause })
    }
    if (profile.id !== id) throw new GameError('loader_failed', `Unexpected loader profile: ${profile.id}`)
    await mkdir(dirname(destination), { recursive: true })
    await Bun.write(destination, text)
    return profile
  }

  private async fromInstaller(pack: PackManifest, runtime: JavaRuntime, mode: VerifyMode, id: string): Promise<VersionJson> {
    const destination = this.versionFile(id)
    const existing = await ProfileResolver.readFile(destination)
    if (mode === 'quick' && existing?.id === id) return existing
    const installer = pack.loader.installer
    if (!installer) throw new GameError('loader_failed', 'The pack has no installer for this loader.')
    const jar = join(this.paths.installersDir, `${pack.loader.type}-${pack.loader.version}-installer.jar`)
    await this.downloader.ensure({ url: installer.url, destination: jar, sha512: installer.sha512 }, 'full')
    await mkdir(this.paths.gameRoot, { recursive: true })
    const profiles = join(this.paths.gameRoot, 'launcher_profiles.json')
    if (!(await Bun.file(profiles).exists())) await Bun.write(profiles, JSON.stringify({ profiles: {}, settings: {}, version: 3 }))
    await this.run(runtime, jar, pack.loader.type)
    const installed = await ProfileResolver.readFile(destination)
    if (!installed || installed.id !== id) throw new GameError('loader_failed', `The installer finished but did not create ${id}.`)
    return installed
  }

  private async run(runtime: JavaRuntime, jar: string, type: string): Promise<void> {
    const child = Bun.spawn([runtime.java, '-jar', jar, '--installClient', this.paths.gameRoot], { cwd: this.paths.gameRoot, stdout: 'pipe', stderr: 'pipe', env: cleanJavaEnvironment() })
    const timer = setTimeout(() => child.kill(), INSTALLER_TIMEOUT_MS)
    const [output, errors, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    clearTimeout(timer)
    if (code !== 0) throw new GameError('loader_failed', `The ${type} installer failed (exit ${code}): ${(errors || output).trim().slice(-500)}`)
  }
}