import { readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { AccountSummary, SkinVariant } from '../../../shared/auth'
import { AuthError } from './auth-error'
import type { MinecraftProfile } from './minecraft-auth'

export interface StoredAccount {
  id: string
  name: string
  skinUrl: string | null
  skinVariant: SkinVariant
  capeUrl: string | null
  addedAt: number
  lastUsedAt: number
}

interface StoreData {
  activeId: string | null
  accounts: StoredAccount[]
}

export class AccountStore {
  private data: StoreData

  constructor(private readonly file: string) {
    this.data = AccountStore.read(file)
  }

  active(): StoredAccount | null {
    return this.data.accounts.find((account) => account.id === this.data.activeId) ?? null
  }

  summaries(): readonly AccountSummary[] {
    return this.data.accounts.map((account) => ({ id: account.id, name: account.name, skinUrl: account.skinUrl, skinVariant: account.skinVariant, capeUrl: account.capeUrl, active: account.id === this.data.activeId }))
  }

  summaryOf(id: string): AccountSummary {
    const found = this.summaries().find((summary) => summary.id === id)
    if (!found) throw new AuthError('session_expired', 'Unknown account')
    return found
  }

  async upsert(profile: MinecraftProfile, activate: boolean): Promise<void> {
    const now = Date.now()
    const existing = this.data.accounts.find((account) => account.id === profile.id)
    if (existing) {
      existing.name = profile.name
      existing.skinUrl = profile.skinUrl
      existing.skinVariant = profile.skinVariant
      existing.capeUrl = profile.capeUrl
      existing.lastUsedAt = now
    } else {
      this.data.accounts.push({ ...profile, addedAt: now, lastUsedAt: now })
    }
    if (activate || this.data.activeId === null) this.data.activeId = profile.id
    await this.persist()
  }

  async setActive(id: string): Promise<void> {
    if (!this.data.accounts.some((account) => account.id === id)) throw new AuthError('session_expired', 'Unknown account')
    this.data.activeId = id
    await this.persist()
  }

  async remove(id: string): Promise<void> {
    this.data.accounts = this.data.accounts.filter((account) => account.id !== id)
    if (this.data.activeId === id) this.data.activeId = this.data.accounts[0]?.id ?? null
    await this.persist()
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })
    const temporary = `${this.file}.tmp`
    await writeFile(temporary, JSON.stringify(this.data, null, 2), { mode: 0o600 })
    await rename(temporary, this.file)
  }

  private static read(file: string): StoreData {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<StoreData>
      const accounts = Array.isArray(parsed.accounts) ? parsed.accounts.filter(AccountStore.isStoredAccount) : []
      const activeId = typeof parsed.activeId === 'string' && accounts.some((account) => account.id === parsed.activeId) ? parsed.activeId : null
      return { activeId, accounts }
    } catch {
      return { activeId: null, accounts: [] }
    }
  }

  private static isStoredAccount(value: unknown): value is StoredAccount {
    if (typeof value !== 'object' || value === null) return false
    const entry = value as Record<string, unknown>
    return typeof entry['id'] === 'string' && typeof entry['name'] === 'string' && typeof entry['addedAt'] === 'number' && typeof entry['lastUsedAt'] === 'number'
  }
}