export type AuthErrorCode =
  | 'not_configured'
  | 'vault_unavailable'
  | 'login_cancelled'
  | 'login_declined'
  | 'login_expired'
  | 'session_expired'
  | 'xbox_no_account'
  | 'xbox_banned'
  | 'xbox_region'
  | 'xbox_adult_verification'
  | 'xbox_child'
  | 'xbox_unknown'
  | 'minecraft_forbidden'
  | 'no_profile'
  | 'entitlement_invalid'
  | 'network'
  | 'invalid_response'
  | 'unexpected'

export interface AuthFailure {
  readonly code: AuthErrorCode
  readonly message: string
}

export type AuthResult<T> =
  | { readonly ok: true, readonly value: T }
  | { readonly ok: false, readonly error: AuthFailure }

export type SkinVariant = 'CLASSIC' | 'SLIM'

export type Ownership = 'purchased' | 'subscription'

export interface AccountSummary {
  readonly id: string
  readonly name: string
  readonly skinUrl: string | null
  readonly skinVariant: SkinVariant
  readonly capeUrl: string | null
  readonly active: boolean
}

export interface DeviceCodePrompt {
  readonly userCode: string
  readonly verificationUri: string
  readonly expiresInSeconds: number
}