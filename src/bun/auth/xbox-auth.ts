import type { AuthErrorCode } from '../../../shared/auth'
import type { HttpClient } from '../core/http'
import { AuthError } from './auth-error'

const XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate'
const XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'

const XERR_CODES: Readonly<Record<number, AuthErrorCode>> = {
  2148916227: 'xbox_banned',
  2148916233: 'xbox_no_account',
  2148916235: 'xbox_region',
  2148916236: 'xbox_adult_verification',
  2148916237: 'xbox_adult_verification',
  2148916238: 'xbox_child'
}

interface XboxResponse {
  Token?: string
  DisplayClaims?: { xui?: { uhs?: string }[] }
  XErr?: number
}

export interface XboxToken {
  readonly token: string
  readonly userHash: string
}

export class XboxAuth {
  constructor(private readonly http: HttpClient) {}

  async authenticate(microsoftAccessToken: string): Promise<XboxToken> {
    const response = await this.http.send<XboxResponse>(XBL_URL, {
      method: 'POST',
      json: {
        Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${microsoftAccessToken}` },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT'
      }
    })
    return XboxAuth.readToken(response.ok, response.data)
  }

  async authorize(xblToken: string): Promise<XboxToken> {
    const response = await this.http.send<XboxResponse>(XSTS_URL, {
      method: 'POST',
      json: {
        Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT'
      }
    })
    if (response.status === 401) {
      const code = XERR_CODES[response.data?.XErr ?? 0] ?? 'xbox_unknown'
      throw new AuthError(code)
    }
    return XboxAuth.readToken(response.ok, response.data)
  }

  private static readToken(ok: boolean, data: XboxResponse | null): XboxToken {
    const userHash = data?.DisplayClaims?.xui?.[0]?.uhs
    if (!ok || !data?.Token || !userHash) throw new AuthError('invalid_response')
    return { token: data.Token, userHash }
  }
}