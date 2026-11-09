import type { AuthResult } from '../../../shared/auth'
import { AuthError } from './auth-error'

export async function attempt<T>(task: () => Promise<T>): Promise<AuthResult<T>> {
  try {
    return { ok: true, value: await task() }
  } catch (error) {
    const failure = AuthError.from(error)
    console.error('Auth failure', failure.code, failure.cause ?? '')
    return { ok: false, error: failure.failure }
  }
}