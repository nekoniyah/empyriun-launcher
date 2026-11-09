import type { HttpClient } from '../core/http'
import { AuthError } from './auth-error'

const AUTHORITY = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'
const SCOPE = 'XboxLive.signin offline_access'
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
const VERIFICATION_HOSTS: ReadonlySet<string> = new Set(['www.microsoft.com', 'microsoft.com', 'login.microsoftonline.com', 'login.live.com', 'aka.ms'])

interface DeviceCodeResponse {
  device_code?: string
  user_code?: string
  verification_uri?: string
  expires_in?: number
  interval?: number
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
}

export interface DeviceCodeSession {
  readonly deviceCode: string
  readonly userCode: string
  readonly verificationUri: string
  readonly expiresAt: number
  readonly intervalSeconds: number
}

export interface MicrosoftTokens {
  readonly accessToken: string
  readonly refreshToken: string
}

export class MicrosoftAuth {
  constructor(private readonly http: HttpClient, private readonly clientId: string) { }

  async requestDeviceCode(): Promise<DeviceCodeSession> {
    if (this.clientId.length === 0) throw new AuthError('not_configured')
    const response = await this.http.send<DeviceCodeResponse>(`${AUTHORITY}/devicecode`, { method: 'POST', form: { client_id: this.clientId, scope: SCOPE } })
    const data = response.data
    if (!response.ok || !data?.device_code || !data.user_code || !data.verification_uri) throw new AuthError('invalid_response')
    const uri = MicrosoftAuth.validateVerificationUri(data.verification_uri)
    return { deviceCode: data.device_code, userCode: data.user_code, verificationUri: uri, expiresAt: Date.now() + (data.expires_in ?? 900) * 1000, intervalSeconds: data.interval ?? 5 }
  }

  async pollDeviceCode(session: DeviceCodeSession, signal: AbortSignal): Promise<MicrosoftTokens> {
    let interval = session.intervalSeconds
    while (Date.now() < session.expiresAt) {
      await MicrosoftAuth.sleep(interval * 1000, signal)
      const response = await this.http.send<TokenResponse>(`${AUTHORITY}/token`, { method: 'POST', form: { grant_type: DEVICE_GRANT, client_id: this.clientId, device_code: session.deviceCode }, signal })
      const tokens = MicrosoftAuth.readTokens(response.data, null)
      if (response.ok && tokens) return tokens
      const error = response.data?.error
      if (error === 'authorization_pending') continue
      if (error === 'slow_down') {
        interval += 5
        continue
      }
      if (error === 'authorization_declined') throw new AuthError('login_declined')
      if (error === 'expired_token' || error === 'bad_verification_code') throw new AuthError('login_expired')
      throw new AuthError('invalid_response')
    }
    throw new AuthError('login_expired')
  }

  async refresh(refreshToken: string): Promise<MicrosoftTokens> {
    if (this.clientId.length === 0) throw new AuthError('not_configured')
    const response = await this.http.send<TokenResponse>(`${AUTHORITY}/token`, { method: 'POST', form: { grant_type: 'refresh_token', client_id: this.clientId, refresh_token: refreshToken, scope: SCOPE } })
    if (response.data?.error === 'invalid_grant') throw new AuthError('session_expired')
    const tokens = MicrosoftAuth.readTokens(response.data, refreshToken)
    if (!response.ok || !tokens) throw new AuthError('invalid_response')
    return tokens
  }

  private static readTokens(data: TokenResponse | null, fallbackRefresh: string | null): MicrosoftTokens | null {
    if (!data?.access_token) return null
    const refreshToken = data.refresh_token ?? fallbackRefresh
    if (!refreshToken) return null
    return { accessToken: data.access_token, refreshToken }
  }

  private static validateVerificationUri(value: string): string {
    let uri: URL
    try { uri = new URL(value) } catch (cause) { throw new AuthError('invalid_response', undefined, { cause }) }
    if (uri.protocol !== 'https:' || !VERIFICATION_HOSTS.has(uri.hostname)) throw new AuthError('invalid_response', `Unexpected verification address: ${uri.hostname}`)
    return uri.href
  }

  private static sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new AuthError('login_cancelled'))
        return
      }
      const onAbort = (): void => {
        clearTimeout(timer)
        reject(new AuthError('login_cancelled'))
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }, ms)
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }
}