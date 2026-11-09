import { badge, list, pageBody, pageHeader, PAGE_SHELL } from '../lib/ui'
import type { AppController } from '../state/app-controller'
import type { AccountSummary } from '../../../shared/auth'
import { skinHead } from '../components/avatar'
import { button } from '../components/button'
import { T } from '../lib/strings'
import { el } from '../lib/dom'
import { View } from './view'

const CONFIRM_MS = 3000

export class AccountsView extends View {
  private readonly rows = el('div')
  private confirming: string | null = null
  private confirmTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly app: AppController) {
    super(PAGE_SHELL)
    this.element.append(pageBody('max-w-3xl', pageHeader(T.accounts.title, T.accounts.note, button(T.accounts.add, 'plus', 'default', () => void this.app.signIn(), 'sm')), this.rows))
    let last: readonly AccountSummary[] | null = null
    this.bind(app.state, (state) => {
      if (state.accounts === last) return
      last = state.accounts
      this.render(state.accounts)
    })
  }

  override destroy(): void {
    if (this.confirmTimer) clearTimeout(this.confirmTimer)
    super.destroy()
  }

  private render(accounts: readonly AccountSummary[]): void {
    this.rows.replaceChildren(accounts.length === 0 ? el('div', { class: 'card flex flex-col items-center gap-3 p-10 text-center' }, el('p', { class: 'text-sm text-muted-foreground', text: T.accounts.empty }), button(T.accounts.add, 'plus', 'default', () => void this.app.signIn(), 'sm')) : list(...accounts.map((account) => this.row(account))))
  }

  private row(account: AccountSummary): HTMLElement {
    const confirming = this.confirming === account.id
    return el(
      'div',
      { class: 'flex items-center gap-3 p-4' },
      skinHead(this.app, account.id, 36, account.name),
      el('div', { class: 'min-w-0 flex-1' }, el('div', { class: 'flex items-center gap-2' }, el('span', { class: 'truncate text-sm font-medium', text: account.name }), account.active ? badge(T.accounts.active, 'success') : null), el('p', { class: 'selectable truncate font-mono text-xs text-muted-foreground', text: account.id })),
      account.active ? button(T.accounts.verify, 'shield', 'outline', () => void this.app.verifyActive(), 'sm') : button(T.accounts.use, 'check', 'outline', () => void this.app.switchAccount(account.id), 'sm'),
      button(confirming ? T.accounts.confirm : T.accounts.remove, 'trash', confirming ? 'destructive' : 'ghost', () => this.remove(account), 'sm')
    )
  }

  private remove(account: AccountSummary): void {
    if (this.confirming === account.id) {
      this.confirming = null
      void this.app.removeAccount(account.id)
      return
    }
    this.confirming = account.id
    this.render(this.app.state.get().accounts)
    if (this.confirmTimer) clearTimeout(this.confirmTimer)
    this.confirmTimer = setTimeout(() => {
      this.confirming = null
      this.render(this.app.state.get().accounts)
    }, CONFIRM_MS)
  }
}