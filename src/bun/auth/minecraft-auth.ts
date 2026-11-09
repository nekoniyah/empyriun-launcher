import type { Ownership, SkinVariant } from '../../../shared/auth'
import type { HttpClient } from '../core/http'
import { AuthError } from './auth-error'
import type { EntitlementVerifier, EntitlementsResponse } from './entitlement-verifier'
import type { XboxToken } from './xbox-auth'

const BASE = 'https://api.minecraftservices.com'
const TEXTURE_HOST = 'textures.minecraft.net'
const UUID_PATTERN = /^[0-9a-f]{32}$/i
const NAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/

interface LoginResponse {
  access_token?: string
  expires_in?: number
}

interface TextureEntry {
  state?: string
  url?: string
  variant?: string
}

interface ProfileResponse {
  id?: string
  name?: string
  skins?: TextureEntry[]
  capes?: TextureEntry[]
}

export interface MinecraftToken {
  readonly accessToken: string
  readonly expiresAt: number
}

export interface MinecraftProfile {
  readonly id: string
  readonly name: string
  readonly skinUrl: string | null
  readonly skinVariant: SkinVariant
  readonly capeUrl: string | null
}

export class MinecraftAuth {
  constructor(private readonly http: HttpClient, private readonly verifier: EntitlementVerifier) { }

  async login(xsts: XboxToken): Promise<MinecraftToken> {
    const response = await this.http.send<LoginResponse>(`${BASE}/authentication/login_with_xbox`, { method: 'POST', json: { identityToken: `XBL3.0 x=${xsts.userHash};${xsts.token}` } })
    if (response.status === 403) throw new AuthError('minecraft_forbidden')
    const data = response.data
    if (!response.ok || !data?.access_token) throw new AuthError('invalid_response')
    return { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000 }
  }

  async verifyOwnership(accessToken: string): Promise<Ownership> {
    const response = await this.http.send<EntitlementsResponse>(`${BASE}/entitlements/mcstore`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (response.status === 403 || response.status === 401) throw new AuthError('minecraft_forbidden')
    if (!response.ok || !response.data) throw new AuthError('invalid_response')
    const names = this.verifier.verify(response.data)
    return names.has('game_minecraft') && names.has('product_minecraft') ? 'purchased' : 'subscription'
  }

  async fetchProfile(accessToken: string): Promise<MinecraftProfile> {
    const response = await this.http.send<ProfileResponse>(`${BASE}/minecraft/profile`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (response.status === 404) throw new AuthError('no_profile')
    if (response.status === 401 || response.status === 403) throw new AuthError('minecraft_forbidden')
    const data = response.data
    if (!response.ok || !data?.id || !data.name || !UUID_PATTERN.test(data.id) || !NAME_PATTERN.test(data.name)) throw new AuthError('invalid_response')
    const skin = data.skins?.find((entry) => entry.state === 'ACTIVE')
    const cape = data.capes?.find((entry) => entry.state === 'ACTIVE')
    return { id: data.id.toLowerCase(), name: data.name, skinUrl: MinecraftAuth.normalizeTexture(skin?.url), skinVariant: skin?.variant === 'SLIM' ? 'SLIM' : 'CLASSIC', capeUrl: MinecraftAuth.normalizeTexture(cape?.url) }
  }

  private static normalizeTexture(value: string | undefined): string | null {
    if (!value) return null
    try {
      const url = new URL(value)
      if (url.hostname !== TEXTURE_HOST || !url.pathname.startsWith('/texture/')) return null
      return `https://${TEXTURE_HOST}${url.pathname}`
    } catch {
      return null
    }
  }
}