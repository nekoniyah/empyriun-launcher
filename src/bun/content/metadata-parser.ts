import type { LinkItem, LoaderType, NewsItem, ShopItem } from '../../../shared/content'
import { GameError } from '../core/game-error'
import { LOADER_HOSTS } from '../core/hosts'
import { validateRelativePath } from '../core/safe-path'
import type { LauncherMetadata, PackFile, PackInstaller, PackLoader, PackManifest } from './metadata-types'

type Json = Record<string, unknown>

const RESERVED_ROOTS: ReadonlySet<string> = new Set(['.launcher', 'logs', 'crash-reports'])
const LOADER_TYPES: readonly LoaderType[] = ['vanilla', 'fabric', 'quilt', 'neoforge', 'forge']
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const VERSION_PATTERN = /^[A-Za-z0-9._+-]{1,64}$/
const SHA512_PATTERN = /^[0-9a-f]{128}$/i
const DENIED_JVM_PREFIXES: readonly string[] = ['-Xmx', '-Xms', '-javaagent', '-agentlib', '-agentpath', '-Xbootclasspath', '-cp', '--class-path', '-classpath', '-Djava.library.path', '-Djava.class.path']
const JVM_ARG_PATTERN = /^-{1,2}[A-Za-z0-9][A-Za-z0-9:=+._,/@-]{0,120}$/
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024
const MAX_FILES = 3000

function invalid(path: string, reason: string): GameError {
  return new GameError('metadata_invalid', `Metadata ${path}: ${reason}`)
}

function record(value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalid(path, 'must be an object')
  return value as Json
}

function list(value: unknown, path: string, max: number): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > max) throw invalid(path, `must be an array of at most ${max} items`)
  return value
}

function text(value: unknown, path: string, min: number, max: number, pattern?: RegExp): string {
  if (typeof value !== 'string' || value.length < min || value.length > max) throw invalid(path, `must be text of ${min} to ${max} characters`)
  if (pattern && !pattern.test(value)) throw invalid(path, 'has an invalid format')
  return value
}

function integer(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw invalid(path, `must be an integer from ${min} to ${max}`)
  return value
}

function httpsUrl(value: unknown, path: string, hosts: ReadonlySet<string> | null): string {
  const raw = text(value, path, 8, 600)
  let url: URL
  try { url = new URL(raw) } catch { throw invalid(path, 'is not a valid URL') }
  if (url.protocol !== 'https:' || url.username || url.password) throw invalid(path, 'must be a plain HTTPS URL')
  if (hosts && !hosts.has(url.hostname)) throw invalid(path, `host ${url.hostname} is not allowed`)
  return url.href
}

export class MetadataParser {
  private readonly fileHosts: ReadonlySet<string>
  private readonly installerHosts: ReadonlySet<string>
  private readonly linkHosts: ReadonlySet<string>

  constructor(downloadHosts: readonly string[], linkHosts: readonly string[]) {
    this.fileHosts = new Set(downloadHosts)
    this.installerHosts = new Set([...downloadHosts, ...LOADER_HOSTS])
    this.linkHosts = new Set(linkHosts)
  }

  parse(raw: unknown): LauncherMetadata {
    const root = record(raw, 'payload')
    const contentVersion = integer(root['contentVersion'], 'contentVersion', 2, 2)
    if (contentVersion !== 2) throw invalid('contentVersion', 'must be version 2')
    return {
      contentVersion: 2,
      news: list(root['news'], 'news', 50).map((entry, index) => this.news(entry, `news[${index}]`)),
      links: list(root['links'], 'links', 30).map((entry, index) => this.link(entry, `links[${index}]`)),
      shop: this.shop(root['shop']),
      pack: this.pack(root['pack'])
    }
  }

  private news(value: unknown, path: string): NewsItem {
    const entry = record(value, path)
    const publishedAt = this.timestamp(entry['publishedAt'], `${path}.publishedAt`)
    return {
      id: text(entry['id'], `${path}.id`, 1, 64, ID_PATTERN),
      title: text(entry['title'], `${path}.title`, 1, 200),
      slug: text(entry['slug'], `${path}.slug`, 1, 100, /^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      excerpt: text(entry['excerpt'], `${path}.excerpt`, 0, 400),
      markdown: text(entry['markdown'], `${path}.markdown`, 0, 16000),
      coverImage: entry['coverImage'] === null ? null : httpsUrl(entry['coverImage'], `${path}.coverImage`, this.fileHosts),
      publishedAt,
      featured: entry['featured'] === true,
      url: entry['url'] === null ? null : httpsUrl(entry['url'], `${path}.url`, this.linkHosts)
    }
  }

  private shop(value: unknown): readonly ShopItem[] {
    const container = record(value, 'shop')
    return list(container['items'], 'shop.items', 100).map((entry, index) => { return this.shopItem(entry, `shop.items[${index}]`) })
  }

  private shopItem(value: unknown, path: string): ShopItem {
    const entry = record(value, path)
    const price = record(entry['price'], `${path}.price`)
    const compareAtPrice = entry['compareAtPrice'] === null ? null : record(entry['compareAtPrice'], `${path}.compareAtPrice`)
    const amount = integer(price['amount'], `${path}.price.amount`, 0, Number.MAX_SAFE_INTEGER)
    const currency = text(price['currency'], `${path}.price.currency`, 3, 3, /^[A-Z]{3}$/)
    const display = text(price['display'], `${path}.price.display`, 1, 24)
    const compare = compareAtPrice ? {
      amount: integer(compareAtPrice['amount'], `${path}.compareAtPrice.amount`, amount, Number.MAX_SAFE_INTEGER),
      currency: text(compareAtPrice['currency'], `${path}.compareAtPrice.currency`, 3, 3, /^[A-Z]{3}$/),
      display: text(compareAtPrice['display'], `${path}.compareAtPrice.display`, 1, 24)
    } : null
    return {
      id: text(entry['id'], `${path}.id`, 1, 64, ID_PATTERN),
      title: text(entry['title'], `${path}.title`, 1, 60),
      slug: text(entry['slug'], `${path}.slug`, 1, 100, /^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      descriptionMarkdown: text(entry['descriptionMarkdown'], `${path}.descriptionMarkdown`, 0, 6000),
      price: { amount, currency, display },
      compareAtPrice: compare,
      images: list(entry['images'], `${path}.images`, 12).map((image, imageIndex) => { return httpsUrl(image, `${path}.images[${imageIndex}]`, this.fileHosts) }),
      category: entry['category'] === null ? null : text(entry['category'], `${path}.category`, 1, 60),
      tags: list(entry['tags'], `${path}.tags`, 20).map((tag, tagIndex) => { return text(tag, `${path}.tags[${tagIndex}]`, 1, 32, /^[A-Za-z0-9 _-]+$/) }),
      available: entry['available'] === true,
      featured: entry['featured'] === true,
      url: httpsUrl(entry['url'], `${path}.url`, this.linkHosts)
    }
  }

  private timestamp(value: unknown, path: string): string {
    const timestamp = text(value, path, 20, 40)
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime()) || date.toISOString() !== timestamp) throw invalid(path, 'must be a valid ISO timestamp')
    return timestamp
  }

  private link(value: unknown, path: string): LinkItem {
    const entry = record(value, path)
    return {
      id: text(entry['id'], `${path}.id`, 1, 64, ID_PATTERN),
      label: text(entry['label'], `${path}.label`, 1, 40),
      url: httpsUrl(entry['url'], `${path}.url`, null)
    }
  }

  private pack(value: unknown): PackManifest {
    const entry = record(value, 'pack')
    const id = text(entry['id'], 'pack.id', 1, 64, ID_PATTERN)
    const jvmArgs = list(entry['jvmArgs'], 'pack.jvmArgs', 40).map((arg, index) => this.jvmArg(arg, `pack.jvmArgs[${index}]`))
    return {
      id,
      name: entry['name'] === undefined ? id : text(entry['name'], 'pack.name', 1, 80),
      version: text(entry['version'], 'pack.version', 1, 40),
      releaseDate: this.releaseDate(entry['releaseDate']),
      minecraft: text(entry['minecraft'], 'pack.minecraft', 1, 32, /^[A-Za-z0-9._-]+$/),
      loader: this.loader(entry['loader']),
      jvmArgs,
      files: this.files(entry['files'])
    }
  }

  private releaseDate(value: unknown): string {
    const date = text(value, 'pack.releaseDate', 10, 10, /^\d{4}-\d{2}-\d{2}$/)
    const timestamp = Date.parse(`${date}T00:00:00.000Z`)
    if (Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) throw invalid('pack.releaseDate', 'must be a real ISO date')
    return date
  }

  private loader(value: unknown): PackLoader {
    const entry = record(value, 'pack.loader')
    const type = text(entry['type'], 'pack.loader.type', 1, 16) as LoaderType
    if (!LOADER_TYPES.includes(type)) throw invalid('pack.loader.type', `must be one of ${LOADER_TYPES.join(', ')}`)
    const version = type === 'vanilla' ? '' : text(entry['version'], 'pack.loader.version', 1, 64, VERSION_PATTERN)
    const needsInstaller = type === 'neoforge' || type === 'forge'
    if (needsInstaller !== (entry['installer'] !== undefined)) throw invalid('pack.loader.installer', needsInstaller ? 'is required for this loader' : 'is only allowed for NeoForge and Forge')
    return { type, version, installer: needsInstaller ? this.installer(entry['installer']) : null }
  }

  private installer(value: unknown): PackInstaller {
    const entry = record(value, 'pack.loader.installer')
    return {
      url: httpsUrl(entry['url'], 'pack.loader.installer.url', this.installerHosts),
      sha512: text(entry['sha512'], 'pack.loader.installer.sha512', 128, 128, SHA512_PATTERN).toLowerCase()
    }
  }

  private jvmArg(value: unknown, path: string): string {
    const arg = text(value, path, 2, 130, JVM_ARG_PATTERN)
    if (DENIED_JVM_PREFIXES.some((prefix) => arg.startsWith(prefix))) throw invalid(path, 'this flag is managed by the launcher')
    return arg
  }

  private files(value: unknown): readonly PackFile[] {
    const seen = new Set<string>()
    return list(value, 'pack.files', MAX_FILES).map((item, index) => {
      const path = `pack.files[${index}]`
      const entry = record(item, path)
      const relative = text(entry['path'], `${path}.path`, 3, 240)
      const [root] = validateRelativePath(relative)
      if (!root || RESERVED_ROOTS.has(root.toLowerCase()) || /[<>:"|?*\u0000-\u001f]/.test(relative) || relative.split('/').some((part) => /[. ]$/.test(part))) throw invalid(`${path}.path`, 'is not an allowed location')
      if (seen.has(relative.toLowerCase())) throw invalid(`${path}.path`, 'is a duplicate')
      seen.add(relative.toLowerCase())
      const policy = entry['policy'] === undefined ? 'enforce' : entry['policy']
      if (policy !== 'enforce' && policy !== 'once') throw invalid(`${path}.policy`, 'must be enforce or once')
      return {
        path: relative,
        url: httpsUrl(entry['url'], `${path}.url`, this.fileHosts),
        sha512: text(entry['sha512'], `${path}.sha512`, 128, 128, SHA512_PATTERN).toLowerCase(),
        size: integer(entry['size'], `${path}.size`, 1, MAX_FILE_SIZE),
        policy
      }
    })
  }
}