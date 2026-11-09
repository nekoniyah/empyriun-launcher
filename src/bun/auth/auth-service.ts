import type { AccountSummary, AuthResult, DeviceCodePrompt } from '../../../shared/auth'
import appConfig from '../../../app.config'
import { HttpClient } from '../core/http'
import type { AppPaths } from '../core/paths'
import { SerialQueue } from '../core/serial-queue'
import { AccountStore } from './account-store'
import { AuthError } from './auth-error'
import { EntitlementVerifier } from './entitlement-verifier'
import { MicrosoftAuth, type DeviceCodeSession, type MicrosoftTokens } from './microsoft-auth'
import { MinecraftAuth, type MinecraftProfile, type MinecraftToken } from './minecraft-auth'
import { TokenVault } from './token-vault'
import { VerifiedSession } from './verified-session'
import { XboxAuth } from './xbox-auth'

const AUTH_HOSTS: ReadonlySet<string> = new Set([
  'login.microsoftonline.com',
  'user.auth.xboxlive.com',
  'xsts.auth.xboxlive.com',
  'api.minecraftservices.com'
])

interface VerifiedChain {
  readonly token: MinecraftToken
  readonly profile: MinecraftProfile
  readonly ownership: 'purchased' | 'subscription'
}

export type LoginObserver = (result: AuthResult<readonly AccountSummary[]>) => void

export class AuthService {
  private readonly queue = new SerialQueue()
  private loginController: AbortController | null = null

  constructor(private readonly microsoft: MicrosoftAuth, private readonly xbox: XboxAuth, private readonly minecraft: MinecraftAuth, private readonly vault: TokenVault, private readonly store: AccountStore) { }

  static create(paths: AppPaths): AuthService {
    const http = new HttpClient(AUTH_HOSTS, `${appConfig.name}/${appConfig.version}`)
    return new AuthService(
      new MicrosoftAuth(http, appConfig.auth.clientId),
      new XboxAuth(http),
      new MinecraftAuth(http, new EntitlementVerifier()),
      new TokenVault(appConfig.identifier),
      new AccountStore(paths.accountsFile)
    )
  }

  listAccounts(): readonly AccountSummary[] {
    return this.store.summaries()
  }

  hasActiveAccount(): boolean {
    return this.store.active() !== null
  }

  async beginLogin(observer: LoginObserver): Promise<DeviceCodePrompt> {
    this.cancelLogin()
    await this.vault.assertAvailable()
    const session = await this.microsoft.requestDeviceCode()
    const controller = new AbortController()
    this.loginController = controller
    void this.finishLogin(session, controller, observer)
    return { userCode: session.userCode, verificationUri: session.verificationUri, expiresInSeconds: Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000)) }
  }

  cancelLogin(): boolean {
    if (!this.loginController) return false
    this.loginController.abort()
    this.loginController = null
    return true
  }

  async switchAccount(accountId: string): Promise<readonly AccountSummary[]> {
    await this.store.setActive(accountId)
    return this.store.summaries()
  }

  async removeAccount(accountId: string): Promise<readonly AccountSummary[]> {
    await this.vault.delete(accountId)
    await this.store.remove(accountId)
    return this.store.summaries()
  }

  async verifyActiveAccount(): Promise<AccountSummary> {
    const session = await this.createSession()
    return this.store.summaryOf(session.uuid)
  }

  createSession(): Promise<VerifiedSession> {
    return this.queue.run(async () => {
      const account = this.store.active()
      if (!account) throw new AuthError('session_expired', 'No account is selected.')
      const stored = await this.vault.load(account.id)
      if (!stored) throw new AuthError('session_expired')
      const tokens = await this.microsoft.refresh(stored)
      await this.vault.save(account.id, tokens.refreshToken)
      const chain = await this.verifyChain(tokens.accessToken)
      if (chain.profile.id !== account.id) throw new AuthError('entitlement_invalid', 'The signed-in account does not match the stored account.')
      await this.store.upsert(chain.profile, false)
      return VerifiedSession.issue(chain.profile.id, chain.profile.name, chain.ownership, chain.token.expiresAt, chain.token.accessToken)
    })
  }

  private async finishLogin(session: DeviceCodeSession, controller: AbortController, observer: LoginObserver): Promise<void> {
    try {
      const tokens = await this.microsoft.pollDeviceCode(session, controller.signal)
      await this.queue.run(() => this.completeLogin(tokens))
      observer({ ok: true, value: this.store.summaries() })
    } catch (error) {
      const failure = controller.signal.aborted ? new AuthError('login_cancelled') : AuthError.from(error)
      console.error('Login failed', failure.code, failure.cause ?? '')
      observer({ ok: false, error: failure.failure })
    } finally {
      if (this.loginController === controller) this.loginController = null
    }
  }

  private async completeLogin(tokens: MicrosoftTokens): Promise<void> {
    const chain = await this.verifyChain(tokens.accessToken)
    await this.vault.save(chain.profile.id, tokens.refreshToken)
    await this.store.upsert(chain.profile, true)
  }

  private async verifyChain(microsoftAccessToken: string): Promise<VerifiedChain> {
    const xbl = await this.xbox.authenticate(microsoftAccessToken)
    const xsts = await this.xbox.authorize(xbl.token)
    const token = await this.minecraft.login(xsts)
    const ownership = await this.minecraft.verifyOwnership(token.accessToken)
    const profile = await this.minecraft.fetchProfile(token.accessToken)
    return { token, profile, ownership }
  }

  skinSource(accountId: string): AccountSummary | null {
    return this.store.summaries().find((summary) => summary.id === accountId) ?? null
  }
}