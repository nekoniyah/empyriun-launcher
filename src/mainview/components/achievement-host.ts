import { el } from '../lib/dom'
import { icon } from '../lib/icons'
import { T } from '../lib/strings'
import type { AppController } from '../state/app-controller'

export class AchievementHost {
  readonly element = el('div', { class: 'pointer-events-none fixed top-10 left-1/2 z-[95] -translate-x-1/2' })
  private readonly queue: { readonly title: string; readonly icon: Parameters<typeof icon>[0] }[] = []
  private busy = false

  constructor(app: AppController) {
    app.achievements.on((item) => {
      this.queue.push(item)
      this.next()
    })
  }

  private next(): void {
    if (this.busy) return
    const item = this.queue.shift()
    if (!item) return
    this.busy = true
    const banner = el(
      'div',
      { class: 'achievement flex w-80 items-center gap-3 border-2 border-black bg-[#1c1c1c] p-3 text-white shadow-lg' },
      el('span', { class: 'flex size-10 shrink-0 items-center justify-center border-2 border-black bg-[#c9a227] text-[#2b1d00]' }, icon(item.icon, 22)),
      el('div', { class: 'min-w-0' }, el('p', { class: 'text-xs font-bold text-[#ffff55]', text: T.eggs.achievement }), el('p', { class: 'truncate text-sm font-bold', text: item.title }))
    )
    this.element.replaceChildren(banner)
    setTimeout(() => {
      banner.remove()
      this.busy = false
      this.next()
    }, 4700)
  }
}