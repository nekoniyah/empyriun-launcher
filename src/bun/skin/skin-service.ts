import type { AccountSummary } from '../../../shared/auth'
import type { SkinImage } from '../../../shared/skin'
import { GameError } from '../core/game-error'

const TEXTURE_HOST = 'textures.minecraft.net'
const MAX_BYTES = 256 * 1024
const MAX_SIDE = 1024
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export class SkinService {
  private readonly cache = new Map<string, string>()

  constructor(private readonly lookup: (accountId: string) => AccountSummary | null, private readonly userAgent: string) { }

  async load(accountId: string): Promise<SkinImage> {
    const account = this.lookup(accountId)
    if (!account) throw new GameError('download_failed', 'Unknown account.')
    const [skin, cape] = await Promise.all([this.texture(account.skinUrl), this.texture(account.capeUrl)])
    return { skin, cape, slim: account.skinVariant === 'SLIM' }
  }

  private async texture(url: string | null): Promise<string | null> {
    if (!url) return null
    const cached = this.cache.get(url)
    if (cached) return cached
    try {
      const target = new URL(url)
      if (target.protocol !== 'https:' || target.hostname !== TEXTURE_HOST || !target.pathname.startsWith('/texture/')) return null
      const response = await fetch(target, { headers: { 'User-Agent': this.userAgent }, redirect: 'error', signal: AbortSignal.timeout(10000) })
      if (!response.ok) return null
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.byteLength > MAX_BYTES || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return null
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const width = view.getUint32(16)
      const height = view.getUint32(20)
      if (width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE) return null
      const uri = `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
      this.cache.set(url, uri)
      return uri
    } catch {
      return null
    }
  }
}