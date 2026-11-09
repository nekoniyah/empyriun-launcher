import type { AppController, AppState } from '../state/app-controller'
import { MENU, MENU_ITEM, SEPARATOR } from '../lib/styles'
import { icon, type IconName } from '../lib/icons'
import { dismissOnOutside } from '../lib/popover'
import { skinHead } from './avatar'
import { T } from '../lib/strings'
import { el } from '../lib/dom'

export class AccountMenu {
  readonly element = el('div', { class: 'relative border-t border-border p-2' })
  private readonly trigger = el('button', { class: 'flex h-12 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors hover:bg-subtle', attrs: { type: 'button' } })
  private readonly menu = el('div', { class: `${MENU} absolute right-2 bottom-full left-2 mb-1 hidden flex-col` })
  private release: (() => void) | null = null
  private key = ''

  constructor(private readonly app: AppController) {
    this.trigger.addEventListener('click', () => (this.release ? this.close() : this.open()))
    this.element.append(this.trigger, this.menu)
    app.state.subscribe((state) => this.render(state))
  }

  private open(): void {
    this.menu.classList.remove('hidden')
    this.menu.classList.add('flex')
    this.release = dismissOnOutside(this.element, () => this.close())
  }

  private close(): void {
    this.release?.()
    this.release = null
    this.menu.classList.add('hidden')
    this.menu.classList.remove('flex')
  }

  private item(label: string, iconName: IconName, action: () => void): HTMLButtonElement {
    return el('button', { class: MENU_ITEM, attrs: { type: 'button' }, on: { click: () => { this.close(); action() } } }, icon(iconName, 16), el('span', { text: label }))
  }

  private render(state: AppState): void {
    const active = state.accounts.find((account) => account.active)
    const key = `${active?.id ?? ''}|${active?.name ?? ''}`
    if (key === this.key) return
    this.key = key
    const name = active?.name ?? T.action.signIn
    this.trigger.replaceChildren(
      skinHead(this.app, active?.id ?? null, 32, name),
      el('span', { class: 'min-w-0 flex-1' }, el('span', { class: 'block truncate text-sm font-medium', text: name }), el('span', { class: `flex items-center gap-1.5 text-xs ${active ? 'text-muted-foreground' : 'text-warning'}` }, active ? el('span', { class: 'size-1.5 rounded-full bg-success' }) : null, el('span', { text: active ? T.menu.verified : T.home.notSignedIn }))),
      el('span', { class: 'rotate-180 text-muted-foreground' }, icon('chevronDown', 14))
    )
    this.menu.replaceChildren(
      this.item(T.menu.accounts, 'users', () => this.app.go('accounts')),
      ...(active ? [this.item(T.menu.verify, 'shield', () => void this.app.verifyActive())] : []),
      el('div', { class: SEPARATOR }),
      this.item(T.menu.add, 'plus', () => void this.app.signIn())
    )
  }
}