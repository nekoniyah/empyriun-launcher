import { release } from 'node:os'
import { GameError } from './game-error'

export type OsName = 'windows' | 'osx' | 'linux'
export type ArchName = 'x86' | 'x86_64' | 'arm64'

export class Platform {
  private constructor(readonly os: OsName, readonly arch: ArchName, readonly osVersion: string) { }

  static current(): Platform {
    const os: OsName | null = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : process.platform === 'linux' ? 'linux' : null
    const arch: ArchName | null = process.arch === 'x64' ? 'x86_64' : process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? 'x86' : null
    if (!os || !arch) throw new GameError('unsupported_platform', `Unsupported platform: ${process.platform} ${process.arch}`)
    return new Platform(os, arch, release())
  }

  get classpathSeparator(): string {
    return this.os === 'windows' ? ';' : ':'
  }

  get javaRuntimeKey(): string {
    if (this.os === 'windows') return this.arch === 'arm64' ? 'windows-arm64' : this.arch === 'x86' ? 'windows-x86' : 'windows-x64'
    if (this.os === 'osx') return this.arch === 'arm64' ? 'mac-os-arm64' : 'mac-os'
    if (this.arch === 'x86_64') return 'linux'
    if (this.arch === 'x86') return 'linux-i386'
    throw new GameError('unsupported_platform', 'Mojang publishes no Java runtime for Linux on ARM.')
  }
}