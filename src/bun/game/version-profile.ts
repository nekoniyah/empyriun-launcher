import { GameError } from '../core/game-error'
import type { Rule } from './rules'

export type ArgumentEntry = string | { readonly rules?: readonly Rule[], readonly value: string | readonly string[] }

export interface Artifact {
  readonly path?: string
  readonly url: string
  readonly sha1?: string
  readonly size?: number
}

export interface LibraryEntry {
  readonly name: string
  readonly url?: string
  readonly rules?: readonly Rule[]
  readonly natives?: Readonly<Record<string, string>>
  readonly downloads?: {
    readonly artifact?: Artifact
  }
}

export interface AssetIndexRef {
  readonly id: string
  readonly url: string
  readonly sha1: string
  readonly size: number
}

export interface VersionJson {
  readonly id: string
  readonly inheritsFrom?: string
  readonly type?: string
  readonly mainClass?: string
  readonly arguments?: {
    readonly game?: readonly ArgumentEntry[]
    readonly jvm?: readonly ArgumentEntry[]
    readonly 'default-user-jvm'?: readonly ArgumentEntry[]
  }
  readonly assetIndex?: AssetIndexRef
  readonly downloads?: {
    readonly client?: {
      readonly url: string
      readonly sha1: string
      readonly size: number
    }
  }
  readonly javaVersion?: {
    readonly component: string
    readonly majorVersion: number
  }
  readonly libraries?: readonly LibraryEntry[]
}

export interface ResolvedProfile {
  readonly id: string
  readonly vanillaId: string
  readonly versionType: string
  readonly mainClass: string
  readonly gameArguments: readonly ArgumentEntry[]
  readonly jvmArguments: readonly ArgumentEntry[]
  readonly defaultJvmArguments: readonly ArgumentEntry[]
  readonly vanillaJvmArguments: readonly ArgumentEntry[]
  readonly loaderJvmArguments: readonly ArgumentEntry[]
  readonly assetIndex: AssetIndexRef
  readonly libraries: readonly LibraryEntry[]
  readonly javaComponent: string
}

export class ProfileResolver {
  static parse(raw: unknown): VersionJson {
    if (typeof raw !== 'object' || raw === null || typeof (raw as { id?: unknown }).id !== 'string') throw new GameError('unsupported_version', 'A version file has an unexpected format.')
    return raw as VersionJson
  }

  static async readFile(path: string): Promise<VersionJson | null> {
    try { return ProfileResolver.parse(JSON.parse(await Bun.file(path).text())) } catch { return null }
  }

  static merge(vanilla: VersionJson, loader: VersionJson | null): ResolvedProfile {
    if (!vanilla.arguments || !vanilla.javaVersion) throw new GameError('unsupported_version', `Minecraft ${vanilla.id} is too old. This launcher supports Minecraft 1.19 and newer.`)
    const mainClass = loader?.mainClass ?? vanilla.mainClass
    const assetIndex = loader?.assetIndex ?? vanilla.assetIndex
    if (!mainClass || !assetIndex) throw new GameError('unsupported_version', `Version ${vanilla.id} is missing its main class or asset index.`)
    const vanillaJvmArguments = vanilla.arguments.jvm ?? []
    const loaderJvmArguments = loader?.arguments?.jvm ?? []
    return {
      id: loader?.id ?? vanilla.id,
      vanillaId: vanilla.id,
      versionType: vanilla.type ?? 'release',
      mainClass,
      gameArguments: [
        ...(vanilla.arguments.game ?? []),
        ...(loader?.arguments?.game ?? [])
      ],
      jvmArguments: [
        ...vanillaJvmArguments,
        ...loaderJvmArguments
      ],
      defaultJvmArguments: vanilla.arguments['default-user-jvm'] ?? [],
      vanillaJvmArguments,
      loaderJvmArguments,
      assetIndex,
      libraries: ProfileResolver.mergeLibraries(
        vanilla.libraries ?? [],
        loader?.libraries ?? []
      ),
      javaComponent: vanilla.javaVersion.component
    }
  }

  private static mergeLibraries(vanilla: readonly LibraryEntry[], loader: readonly LibraryEntry[]): readonly LibraryEntry[] {
    const merged = new Map<string, LibraryEntry>()
    for (const library of [...loader, ...vanilla]) {
      const [group, artifact, , classifier] = library.name.split(':')
      const key = `${group}:${artifact}:${classifier ?? ''}`
      if (!merged.has(key)) merged.set(key, library)
    }
    return [...merged.values()]
  }
}