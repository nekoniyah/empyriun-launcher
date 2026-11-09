import { el } from '../lib/dom'
import type { Store, Unsubscribe } from '../lib/store'

export abstract class View {
  readonly element: HTMLElement
  private readonly disposers: Unsubscribe[] = []

  protected constructor(className: string) {
    this.element = el('section', { class: className })
  }

  protected bind<T>(store: Store<T>, render: (value: T) => void): void {
    this.disposers.push(store.subscribe(render))
  }

  destroy(): void {
    this.disposers.forEach((dispose) => dispose())
    this.disposers.length = 0
  }
}

export function panel(...children: (Node | string)[]): HTMLElement {
  return el('div', { class: 'flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-xs' }, ...children)
}

export function heading(text: string): HTMLElement {
  return el('h2', { class: 'text-sm font-medium text-muted-foreground', text })
}

export function pageTitle(text: string): HTMLElement {
  return el('h1', { class: 'text-2xl font-semibold tracking-tight', text })
}