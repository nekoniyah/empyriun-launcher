import type { AuthErrorCode, AuthFailure } from '../../../shared/auth'
import { HttpError } from '../core/http'

const MESSAGES: Readonly<Record<AuthErrorCode, string>> = {
  not_configured: 'The launcher has no Azure client ID configured.',
  vault_unavailable: 'The operating system credential store is unavailable, so sign-in is refused. On Linux, start GNOME Keyring or KWallet.',
  login_cancelled: 'Sign-in was cancelled.',
  login_declined: 'Sign-in was declined in the browser.',
  login_expired: 'The sign-in code expired. Start again.',
  session_expired: 'This account needs to sign in again.',
  xbox_no_account: 'This Microsoft account has no Xbox profile. Create one at minecraft.net, then try again.',
  xbox_banned: 'This account is banned from Xbox.',
  xbox_region: 'Xbox Live is not available in the country of this account.',
  xbox_adult_verification: 'This account needs adult verification on the Xbox page.',
  xbox_child: 'This is a child account. An adult must add it to a Microsoft Family.',
  xbox_unknown: 'Xbox rejected this account.',
  minecraft_forbidden: 'Minecraft services refused this launcher. The Azure app is probably not approved by Mojang yet.',
  no_profile: 'No Minecraft Java profile found. Game Pass players must sign in once with the official launcher first.',
  entitlement_invalid: 'The ownership proof from Mojang failed verification.',
  network: 'Network error. Check your connection and try again.',
  invalid_response: 'An authentication server returned an unexpected response.',
  unexpected: 'An unexpected error occurred.'
}

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? MESSAGES[code], options)
    this.name = 'AuthError'
  }

  get failure(): AuthFailure {
    return { code: this.code, message: this.message }
  }

  static from(error: unknown): AuthError {
    if (error instanceof AuthError) return error
    if (error instanceof HttpError) return new AuthError('network', undefined, { cause: error })
    return new AuthError('unexpected', undefined, { cause: error })
  }
}