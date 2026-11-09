import { LANGUAGES, THEMES } from '../../../shared/preferences'
import { el } from '../lib/dom'
import { icon, type IconName } from '../lib/icons'
import { T } from '../lib/strings'
import type { AppController, ViewId } from '../state/app-controller'

interface Command {
  readonly group: string
  readonly label: string
  readonly icon: IconName
  readonly run: () => void
}

const VIEWS: readonly { readonly id: ViewId, readonly icon: IconName }[] = [
  { id: 'home', icon: 'home' },
  { id: 'updates', icon: 'news' },
  { id: 'shop', icon: 'cart' },
  { id: 'accounts', icon: 'users' },
  { id: 'settings', icon: 'settings' },
  { id: 'logs', icon: 'terminal' }
]

function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export class CommandPalette {
  readonly element = el('div', { class: 'fixed inset-0 z-50 hidden items-start justify-center bg-black/50 pt-28' })
  private readonly input = el('input', { class: 'w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground', attrs: { type: 'text', spellcheck: 'false', autocomplete: 'off' } })
  private readonly list = el('div', { class: 'flex max-h-80 flex-col overflow-y-auto p-1' })
  private matches: Command[] = []
  private selected = 0

  constructor(private readonly app: AppController) {
    this.element.append(
      el(
        'div',
        { class: 'flex w-[34rem] animate-rise flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl' },
        this.input,
        el('div', { class: 'border-t border-line' }),
        this.list
      )
    )
    this.element.addEventListener('pointerdown', (event) => { if (event.target === this.element) this.close() })
    this.input.addEventListener('input', () => this.filter())
    this.input.addEventListener('keydown', (event) => this.onKey(event))
    document.addEventListener(
      'keydown',
      (event) => {
        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyK') {
          event.preventDefault()
          if (this.element.classList.contains('hidden')) this.open()
          else this.close()
        }
      }
    )
    app.paletteRequests.on(() => this.open())
  }

  private commands(): Command[] {
    const { game } = this.app.state.get()
    const navigate = VIEWS.map(
      (view): Command => ({
        group: T.palette.navigate,
        label: T.nav[view.id],
        icon: view.icon,
        run: () => this.app.go(view.id)
      })
    )
    const actions: Command[] = [
      {
        group: T.palette.actions,
        label: game.phase === 'running' ? T.action.stop : T.action.play,
        icon: game.phase === 'running' ? 'stop' : 'play',
        run: () => {
          if (game.phase === 'running') void this.app.stop()
          else void this.app.play(false)
        }
      },
      {
        group: T.palette.actions,
        label: T.action.repair,
        icon: 'wrench',
        run: () => void this.app.repair()
      },
      {
        group: T.palette.actions,
        label: T.menu.add,
        icon: 'plus',
        run: () => void this.app.signIn()
      },
      {
        group: T.palette.actions,
        label: T.menu.verify,
        icon: 'shield',
        run: () => void this.app.verifyActive()
      }
    ]
    const themes = THEMES.map(
      (theme): Command => ({
        group: T.palette.appearance,
        label: `${T.settings.theme}: ${T.themes[theme]}`,
        icon: 'palette',
        run: () => void this.app.savePreferences({ theme })
      })
    )
    const languages = LANGUAGES.map(
      (language): Command => ({
        group: T.palette.appearance,
        label: `${T.settings.language}: ${T.languages[language]}`,
        icon: 'globe',
        run: () => void this.app.savePreferences({ language })
      })
    )
    return [...navigate, ...actions, ...themes, ...languages]
  }

  private open(): void {
    this.input.placeholder = T.palette.placeholder
    this.input.value = ''
    this.element.classList.remove('hidden')
    this.element.classList.add('flex')
    this.filter()
    this.input.focus()
  }

  private close(): void {
    this.element.classList.add('hidden')
    this.element.classList.remove('flex')
  }

  private filter(): void {
    const query = fold(this.input.value.trim())
    this.matches = this.commands().filter((command) => { return fold(`${command.group} ${command.label}`).includes(query) })
    this.selected = 0
    this.render()
  }

  private onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      this.selected = (this.selected + step + Math.max(1, this.matches.length)) % Math.max(1, this.matches.length)
      this.render()
      return
    }
    if (event.key === 'Enter') this.run(this.matches[this.selected])
  }

  private run(command: Command | undefined): void {
    if (!command) return
    this.close()
    command.run()
  }

  private render(): void {
    if (this.matches.length === 0) {
      this.list.replaceChildren(el('p', { class: 'px-4 py-6 text-center text-sm text-muted-foreground', text: T.palette.empty }))
      return
    }
    let lastGroup = ''
    const rows: HTMLElement[] = []
    this.matches.forEach((command, index) => {
      if (command.group !== lastGroup) {
        lastGroup = command.group
        rows.push(el('p', { class: 'px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground', text: command.group }))
      }
      const row = el(
        'button',
        {
          class: `flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${index === this.selected ? 'bg-subtle' : 'hover:bg-subtle'}`,
          attrs: { type: 'button' },
          on: { click: () => this.run(command) }
        },
        icon(command.icon, 16),
        el('span', { text: command.label })
      )
      rows.push(row)
    }
    )
    this.list.replaceChildren(...rows)
    this.list.querySelectorAll('button')
    [this.selected]?.scrollIntoView({ block: 'nearest' })
  }
}