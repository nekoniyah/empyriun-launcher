import type { AppResult } from '../../../shared/game'
import { AuthError } from '../auth/auth-error'
import { GameError } from './game-error'
import { HttpError } from './http'

export async function attemptApp<T>(task: () => Promise<T>): Promise<AppResult<T>> {
  try {
    return { ok: true, value: await task() }
  } catch (error) {
    console.error('Operation failed', error)
    if (error instanceof GameError || error instanceof AuthError) return { ok: false, error: error.failure }
    if (error instanceof HttpError) return { ok: false, error: { code: 'download_failed', message: 'A network request failed.' } }
    return { ok: false, error: { code: 'unexpected', message: 'An unexpected error occurred.' } }
  }
}