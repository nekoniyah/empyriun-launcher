import type { AppFailure, GameErrorCode } from '../../../shared/game'

export class GameError extends Error {
  constructor(readonly code: GameErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'GameError'
  }

  get failure(): AppFailure {
    return { code: this.code, message: this.message }
  }
}