import { homedir } from 'node:os'
import { join } from 'node:path'
import appConfig from '../../../app.config'

export class AppPaths {
  readonly root: string = AppPaths.resolveRoot()

  get accountsFile(): string {
    return join(this.root, 'accounts.json')
  }

  get metadataCacheFile(): string {
    return join(this.root, 'metadata-cache.json')
  }

  get gameRoot(): string {
    return join(this.root, 'game')
  }

  get versionsDir(): string {
    return join(this.gameRoot, 'versions')
  }

  get librariesDir(): string {
    return join(this.gameRoot, 'libraries')
  }

  get assetsDir(): string {
    return join(this.gameRoot, 'assets')
  }

  get runtimeDir(): string {
    return join(this.root, 'runtime')
  }

  get installersDir(): string {
    return join(this.root, 'installers')
  }

  get settingsFile(): string {
    return join(this.root, 'settings.json')
  }

  nativesDir(versionId: string): string {
    return join(this.versionsDir, versionId, 'natives')
  }

  instanceDir(packId: string): string {
    return join(this.root, 'instances', packId)
  }

  private static resolveRoot(): string {
    const home = homedir()
    if (process.platform === 'win32') return join(process.env['APPDATA'] ?? join(home, 'AppData', 'Roaming'), appConfig.name)
    if (process.platform === 'darwin') return join(home, 'Library', 'Application Support', appConfig.name)
    return join(process.env['XDG_DATA_HOME'] ?? join(home, '.local', 'share'), appConfig.name)
  }
}