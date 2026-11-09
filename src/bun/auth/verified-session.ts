import type { Ownership } from '../../../shared/auth'

export class VerifiedSession {
  private constructor(readonly uuid: string, readonly username: string, readonly ownership: Ownership, readonly expiresAt: number, private readonly token: string) { }

  static issue(uuid: string, username: string, ownership: Ownership, expiresAt: number, token: string): VerifiedSession {
    return new VerifiedSession(uuid, username, ownership, expiresAt, token)
  }

  get accessToken(): string {
    return this.token
  }

  toJSON(): { uuid: string; username: string } {
    return { uuid: this.uuid, username: this.username }
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `VerifiedSession(${this.username})`
  }
}