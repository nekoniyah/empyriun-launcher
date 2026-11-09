import appConfig from '../../../app.config'
import { LOGO_SRC } from '../lib/brand'
import { el } from '../lib/dom'
import { icon, type IconName } from '../lib/icons'
import { T } from '../lib/strings'
import { kbd } from '../lib/ui'
import type { AppController, ViewId } from '../state/app-controller'
import { AccountMenu } from './account-menu'

interface Entry {
  readonly id: ViewId
  readonly icon: IconName
  readonly label: () => string
}

interface Section {
  readonly title: (() => string) | null
  readonly entries: readonly Entry[]
}

const SECTIONS: readonly Section[] = [
  {
    title: null,
    entries: [
      { id: 'home', icon: 'gamepad', label: () => T.nav.home }
    ]
  },
  {
    title: () => T.nav.pack,
    entries: [
      { id: 'updates', icon: 'news', label: () => T.nav.updates },
      { id: 'shop', icon: 'cart', label: () => T.nav.shop }
    ]
  },
  {
    title: () => T.nav.system,
    entries: [
      { id: 'logs', icon: 'terminal', label: () => T.nav.logs },
      { id: 'settings', icon: 'settings', label: () => T.nav.settings }
    ]
  }
]

const ITEM = 'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground'
const ACTIVE = 'bg-subtle font-medium text-foreground'

export class Sidebar {
  readonly element = el('nav', { class: 'relative z-30 flex w-60 shrink-0 flex-col border-r border-border bg-sidebar' })

  private readonly items = new Map<ViewId, HTMLButtonElement>()

  constructor(private readonly app: AppController) {
    const logo = el(
      'button',
      {
        class: 'flex size-7 shrink-0 items-center justify-center rounded-md transition-transform active:scale-90',
        attrs: { id: 'brand-logo', type: 'button', 'aria-label': appConfig.title },
        on: { click: (event) => app.logoClicks.emit({ x: event.clientX, y: event.clientY }) }
      },
      el('img', {
        class: 'size-6',
        attrs: { src: LOGO_SRC, alt: '', draggable: 'false' }
      })
    )
    const version = el('button', {
      class: 'text-xs text-muted-foreground transition-colors hover:text-foreground',
      attrs: { type: 'button' },
      text: `${appConfig.title} v${appConfig.version}`,
      on: { click: (event) => { if (event.shiftKey) app.notify('info', T.eggs.credits(appConfig.title)) } }
    })
    const search = el(
      'button',
      {
        class: 'mx-3 mt-3 flex h-8 items-center gap-2 rounded-md border border-input px-2.5 text-sm text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground',
        attrs: { type: 'button' },
        on: { click: () => app.paletteRequests.emit() }
      },
      icon('search', 14),
      el('span', { class: 'flex-1 text-left', text: T.topbar.search }),
      kbd('Ctrl K')
    )
    const groups = el('div', { class: 'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4' }, ...SECTIONS.map((section) => this.section(section)))
    this.element.append(
      search,
      groups,
      el(
        'div',
        { class: 'flex items-center gap-2 px-4 pb-3' },
        logo,
        version
      ),
      new AccountMenu(app).element
    )
    app.view.subscribe((current) => { for (const [id, button] of this.items) button.className = `${ITEM} ${id === current ? ACTIVE : ''}` })
  }

  private section(section: Section): HTMLElement {
    return el(
      'div',
      { class: 'flex flex-col gap-0.5' },
      section.title ? el('p', {
        class: 'px-2.5 pb-1 text-xs font-medium text-muted-foreground',
        text: section.title()
      }) : null,
      ...section.entries.map((entry) => {
        const button = el(
          'button',
          {
            class: ITEM,
            attrs: { type: 'button' },
            on: { click: () => this.app.go(entry.id) }
          },
          icon(entry.icon, 16),
          el('span', { text: entry.label() })
        )
        this.items.set(entry.id, button)
        return button
      })
    )
  }
}