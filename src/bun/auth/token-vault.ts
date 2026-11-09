import { secrets } from 'bun'
import { AuthError } from './auth-error'

const PROBE_NAME = 'vault-probe'

export class TokenVault {
  private verified = false

  constructor(private readonly service: string) { }

  async assertAvailable(): Promise<void> {
    if (this.verified) return
    const value = crypto.randomUUID()
    try {
      await secrets.set({ service: this.service, name: PROBE_NAME, value })
      const stored = await secrets.get({ service: this.service, name: PROBE_NAME })
      await secrets.delete({ service: this.service, name: PROBE_NAME })
      if (stored !== value) throw new Error('Credential store probe mismatch')
    } catch (error) {
      throw new AuthError('vault_unavailable', undefined, { cause: error })
    }
    this.verified = true
  }

  async save(accountId: string, refreshToken: string): Promise<void> {
    await this.assertAvailable()
    try { await secrets.set({ service: this.service, name: TokenVault.entryName(accountId), value: refreshToken }) } catch (error) { throw new AuthError('vault_unavailable', undefined, { cause: error }) }
  }

  async load(accountId: string): Promise<string | null> {
    await this.assertAvailable()
    try { return await secrets.get({ service: this.service, name: TokenVault.entryName(accountId) }) } catch (error) { throw new AuthError('vault_unavailable', undefined, { cause: error }) }
  }

  async delete(accountId: string): Promise<void> {
    try { await secrets.delete({ service: this.service, name: TokenVault.entryName(accountId) }) } catch (error) { throw new AuthError('vault_unavailable', undefined, { cause: error }) }
  }

  private static entryName(accountId: string): string {
    return `refresh-token:${accountId}`
  }
}