import { el } from '../lib/dom'
import { CARD } from '../lib/styles'
import { T } from '../lib/strings'
import type { AppController, AppState } from '../state/app-controller'
import { ProgressBar } from './progress-bar'

export class ProgressDock {
  readonly element = el('div', { class: 'pointer-events-none fixed inset-x-0 bottom-6 z-30 hidden justify-center px-6' })
  private readonly label = el('span', { class: 'min-w-0 truncate text-sm font-semibold' })
  private readonly percent = el('span', { class: 'font-pixel text-sm font-bold text-accent' })
  private readonly detail = el('p', { class: 'truncate text-xs text-mute' })
  private readonly bar = new ProgressBar()

  constructor(app: AppController) {
    this.element.append(el('div', { class: `${CARD} pointer-events-auto flex w-[32rem] max-w-full animate-rise flex-col gap-2 p-4` }, el('div', { class: 'flex items-center justify-between gap-3' }, this.label, this.percent), this.bar.element, this.detail))
    app.state.subscribe((state) => this.render(state))
  }

  private render({ game, progress }: AppState): void {
    const installing = game.phase === 'installing'
    const visible = installing || game.phase === 'launching'
    this.element.classList.toggle('hidden', !visible)
    this.element.classList.toggle('flex', visible)
    if (!visible) return
    if (installing) {
      const overall = progress?.overall ?? 0
      this.label.textContent = T.stage[progress?.stage ?? 'metadata']
      this.percent.textContent = `${Math.round(overall * 100)}%`
      this.bar.set(overall)
      this.detail.textContent = progress?.label ?? ''
      return
    }
    this.label.textContent = T.stage.launching
    this.percent.textContent = ''
    this.bar.set(null)
    this.detail.textContent = ''
  }
}