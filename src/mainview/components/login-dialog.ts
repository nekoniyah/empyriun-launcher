import { el } from '../lib/dom'
import { T } from '../lib/strings'
import type { AppController, AppState } from '../state/app-controller'
import { button } from './button'

export class LoginDialog {
  readonly element = el('div', { class: 'fixed inset-0 z-40 hidden items-center justify-center bg-black/60' })
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly app: AppController) {
    this.app.state.subscribe((state) => this.render(state.login))
  }

  private render(login: AppState['login']): void {
    this.stopTimer()
    this.element.classList.toggle('hidden', login === null)
    this.element.classList.toggle('flex', login !== null)
    if (!login) return this.element.replaceChildren()
    const remaining = el('p', { class: 'text-xs text-muted-foreground' })
    const update = (): void => {
      const seconds = Math.max(0, login.prompt.expiresInSeconds - Math.floor((Date.now() - login.startedAt) / 1000))
      remaining.textContent = T.dialog.expires(Math.floor(seconds / 60), seconds % 60)
    }
    update()
    this.timer = setInterval(update, 1000)
    this.element.replaceChildren(
      el(
        'div',
        { class: 'flex w-[26rem] animate-rise flex-col gap-4 rounded-lg border border-border bg-popover p-6 shadow-xl' },
        el('div', { class: 'flex flex-col gap-1.5' }, el('h2', { class: 'heading text-lg', text: T.dialog.title }), el('p', { class: 'text-sm text-muted-foreground', text: T.dialog.lead })),
        el('div', { class: 'selectable rounded-md border border-border bg-control py-4 text-center font-mono text-2xl font-semibold tracking-[0.35em]', text: login.prompt.userCode }),
        el('p', { class: 'selectable text-center text-xs break-all text-muted-foreground', text: login.prompt.verificationUri }),
        remaining,
        el('div', { class: 'flex justify-end gap-2' }, button(T.dialog.cancel, null, 'ghost', () => void this.app.cancelLogin()), button(T.dialog.copy, 'copy', 'outline', () => void this.copy(login.prompt.userCode)), button(T.dialog.open, 'external', 'default', () => void this.app.openLink(login.prompt.verificationUri)))
      )
    )
  }

  private async copy(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code)
      this.app.notify('success', T.dialog.copied)
    } catch {
      this.app.notify('info', T.dialog.copyManual)
    }
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}