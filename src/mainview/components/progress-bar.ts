import { el } from '../lib/dom'

export class ProgressBar {
  private readonly fill = el('div', { class: 'h-full rounded-full bg-primary transition-[width] duration-200' })
  readonly element = el('div', { class: 'h-2 overflow-hidden rounded-full bg-secondary' }, this.fill)

  set(fraction: number | null): void {
    this.fill.classList.toggle('animate-pulse', fraction === null)
    this.fill.style.width = fraction === null ? '100%' : `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`
  }
}