import appConfig from '../../../app.config'
import { LOGO_SRC } from '../lib/brand'
import { el } from '../lib/dom'
import { icon, type IconName } from '../lib/icons'
import { T } from '../lib/strings'
import { WindowDragController } from '../lib/window-drag'
import type { AppController } from '../state/app-controller'

type Os = 'windows' | 'mac' | 'linux'

const DRAG = 'electrobun-webkit-app-region-drag'
const NO_DRAG = 'electrobun-webkit-app-region-no-drag'
const WINDOWS_BUTTON = 'inline-flex h-8 w-[46px] items-center justify-center text-foreground/80 transition-colors hover:bg-foreground/10'
const WINDOWS_CLOSE = 'inline-flex h-8 w-[46px] items-center justify-center text-foreground/80 transition-colors hover:bg-[#c42b1c] hover:text-white'
const LINUX_BUTTON = 'inline-flex size-6 items-center justify-center rounded-full bg-foreground/5 text-foreground/80 transition-colors hover:bg-foreground/15'

function detect(): Os {
  const agent = navigator.userAgent
  return /Mac/i.test(agent) ? 'mac' : /Windows/i.test(agent) ? 'windows' : 'linux'
}

export class Titlebar {
  readonly element: HTMLElement
  private readonly os = detect()
  private readonly maximizeButton = el('button', { attrs: { type: 'button' } })

  constructor(private readonly app: AppController) {
    const handle = el(
      'div',
      { class: `${DRAG} flex h-full min-w-0 flex-1 items-center gap-2 px-3 ${this.os === 'mac' ? 'justify-center' : ''}` },
      el('img', { class: 'size-4', attrs: { src: LOGO_SRC, alt: '', draggable: 'false' } }),
      el('span', { class: 'text-xs text-muted-foreground', text: appConfig.title })
    )
    handle.addEventListener('dblclick', () => this.app.bridge.maximizeWindow())
    new WindowDragController(handle, app)
    this.element = el('header', { class: 'relative z-40 flex h-8 shrink-0 items-center border-b border-border bg-sidebar select-none' }, this.os === 'mac' ? this.dots() : null, handle, this.os === 'mac' ? null : this.caption())
    this.app.state.subscribe((state) => {
      handle.classList.toggle(DRAG, !state.maximized)
      const label = state.maximized ? T.window.restore : T.window.maximize
      this.maximizeButton.setAttribute('aria-label', label)
      this.maximizeButton.title = label
      this.maximizeButton.replaceChildren(this.glyph(state.maximized ? 'restore' : 'square'))
    })
  }

  private glyph(name: IconName): SVGSVGElement {
    return this.os === 'windows' ? icon(name, 10, 1.4) : icon(name, 12, 1.8)
  }

  private captionButton(name: IconName, label: string, action: () => void, close: boolean): HTMLButtonElement {
    const className = this.os === 'windows' ? (close ? WINDOWS_CLOSE : WINDOWS_BUTTON) : LINUX_BUTTON
    return el('button', { class: className, attrs: { type: 'button', title: label, 'aria-label': label }, on: { click: action } }, this.glyph(name))
  }

  private caption(): HTMLElement {
    this.maximizeButton.className = this.os === 'windows' ? WINDOWS_BUTTON : LINUX_BUTTON
    this.maximizeButton.addEventListener('click', () => this.app.bridge.maximizeWindow())
    return el(
      'div',
      { class: `${NO_DRAG} flex items-center ${this.os === 'linux' ? 'gap-2 pr-3' : ''}` },
      this.captionButton('minus', T.window.minimize, () => this.app.bridge.minimizeWindow(), false),
      this.maximizeButton,
      this.captionButton('x', T.window.close, () => this.app.bridge.closeWindow(), true)
    )
  }

  private dots(): HTMLElement {
    const dot = (color: string, label: string, action: () => void): HTMLButtonElement => el('button', { class: `size-3 rounded-full ${color} transition-opacity hover:opacity-80`, attrs: { type: 'button', title: label, 'aria-label': label }, on: { click: action } })
    return el(
      'div',
      { class: `${NO_DRAG} flex items-center gap-2 pl-3` },
      dot('bg-[#ff5f57]', T.window.close, () => this.app.bridge.closeWindow()),
      dot('bg-[#febc2e]', T.window.minimize, () => this.app.bridge.minimizeWindow()),
      dot('bg-[#28c840]', T.window.maximize, () => this.app.bridge.maximizeWindow())
    )
  }
}