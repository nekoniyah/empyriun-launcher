import type { LinkItem, LoaderType, NewsItem, ShopItem } from '../../../shared/content'

export interface PackFile {
  readonly path: string
  readonly url: string
  readonly sha512: string
  readonly size: number
  readonly policy: 'enforce' | 'once'
}

export interface PackInstaller {
  readonly url: string
  readonly sha512: string
}

export interface PackLoader {
  readonly type: LoaderType
  readonly version: string
  readonly installer: PackInstaller | null
}

export interface PackManifest {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly releaseDate: string
  readonly minecraft: string
  readonly loader: PackLoader
  readonly jvmArgs: readonly string[]
  readonly files: readonly PackFile[]
}

export interface LauncherMetadata {
  readonly contentVersion: 2
  readonly news: readonly NewsItem[]
  readonly links: readonly LinkItem[]
  readonly shop: readonly ShopItem[]
  readonly pack: PackManifest
}