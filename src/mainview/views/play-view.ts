import type { MetadataSummary, NewsItem, ShopItem } from '../../../shared/content'
import { badge, keyValue, list, pageHeader, sectionHeader } from '../lib/ui'
import type { AppController, AppState } from '../state/app-controller'
import { ProgressBar } from '../components/progress-bar'
import { PlayerPanel } from '../components/player-panel'
import { contentImage } from '../content/content-image'
import { buttonClass } from '../components/button'
import { icon, type IconName } from '../lib/icons'
import { dismissOnOutside } from '../lib/popover'
import { MENU, MENU_ITEM } from '../lib/styles'
import { localeTag, T } from '../lib/strings'
import { effects } from '../lib/effects'
import { el } from '../lib/dom'
import { View } from './view'

function releaseDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' })
}

export class PlayView extends View {
  private readonly header = el('div')
  private readonly statusDot = el('span', { class: 'size-2 rounded-full bg-muted-foreground' })
  private readonly statusText = el('span', { class: 'text-sm font-medium' })
  private readonly launch = el('button', { attrs: { type: 'button' } })
  private readonly more = el('button', { class: buttonClass('outline', 'lg'), attrs: { type: 'button' } })
  private readonly menu = el('div', { class: `${MENU} absolute top-full right-0 mt-1 hidden w-56 flex-col` })
  private readonly bar = new ProgressBar()
  private readonly player: PlayerPanel
  private readonly progressLabel = el('span', { class: 'text-muted-foreground' })
  private readonly progressValue = el('span', { class: 'font-medium' })
  private readonly progressBox = el('div', { class: 'hidden flex-col gap-2 text-xs' })
  private readonly checks = el('div', { class: 'flex flex-col' })
  private readonly news = el('div')
  private readonly details = el('div')
  private readonly links = el('div')
  private readonly featured = el('div')
  private renderedMetadata: MetadataSummary | null = null
  private release: (() => void) | null = null

  constructor(private readonly app: AppController) {
    super('flex h-full animate-rise flex-col overflow-y-auto')
    this.more.append(icon('chevronDown', 16))
    this.more.setAttribute('aria-label', T.action.repair)
    this.more.addEventListener('click', () => {
      if (this.release) this.closeMenu()
      else this.openMenu()
    })
    this.launch.addEventListener('click', (event) => { this.onLaunch(event) })
    this.progressBox.append(el('div', { class: 'flex items-center justify-between' }, this.progressLabel, this.progressValue), this.bar.element)
    this.player = new PlayerPanel(app)
    const launchRow = el('div', { class: 'relative flex items-center gap-2' }, this.launch, this.more, this.menu)
    const launchCard = el('section', { class: 'card flex flex-col gap-5 p-6' }, el('div', { class: 'flex items-center gap-2' }, this.statusDot, this.statusText), launchRow, this.progressBox, this.checks)
    const newsAll = el('button', { class: buttonClass('ghost', 'sm'), attrs: { type: 'button' }, on: { click: () => this.app.go('updates') }, text: T.home.allNews })
    const main = el('div', { class: 'flex min-w-0 flex-col gap-8' }, launchCard, el('section', { class: 'flex flex-col gap-3' }, sectionHeader(T.home.latestNews, newsAll), this.news))
    const side = el('div', { class: 'flex flex-col gap-6' }, this.player.element, el('section', { class: 'flex flex-col gap-3' }, sectionHeader(T.home.modpack), this.details), el('section', { class: 'flex flex-col gap-3' }, sectionHeader(T.home.links), this.links), this.featured)
    this.element.append(el('div', { class: 'mx-auto flex w-full max-w-5xl flex-col gap-8 p-8' }, this.header, el('div', { class: 'grid grid-cols-[1fr_20rem] gap-8' }, main, side)))
    this.bind(app.state, (state) => { this.refresh(state) })
  }

  override destroy(): void {
    this.release?.()
    this.player.dispose()
    super.destroy()
  }

  private refresh(state: AppState): void {
    const { metadata, accounts, game, progress, integrity } = state
    const active = accounts.find((account) => account.active)
    const problems = integrity ? integrity.files.filter((file) => file.state !== 'ok').length : 0
    if (metadata !== this.renderedMetadata) {
      this.renderedMetadata = metadata
      this.renderNews(metadata)
      this.renderLinks(metadata)
    }
    this.renderHeader(metadata, integrity ? problems : null)
    this.renderDetails(metadata)
    this.renderFeatured(metadata?.shop ?? [])
    this.renderChecks(active?.name ?? null, integrity ? problems : null, metadata?.pack.fileCount ?? 0)
    const busy = game.phase === 'installing' || game.phase === 'launching'
    this.more.disabled = busy
    const installing = game.phase === 'installing'
    this.progressBox.classList.toggle('hidden', !installing)
    this.progressBox.classList.toggle('flex', installing)
    if (installing) {
      const overall = progress?.overall ?? 0
      this.bar.set(overall)
      this.progressLabel.textContent = T.stage[progress?.stage ?? 'metadata']
      this.progressValue.textContent = `${Math.round(overall * 100)}%`
    }
    const version = metadata?.pack.version ?? ''
    if (!active) {
      this.setLaunch(T.action.signIn, 'user', 'default', false, T.home.signInHint, 'bg-warning')
      return
    }
    if (game.phase === 'running') {
      this.setLaunch(T.action.stop, 'stop', 'destructive', false, T.home.running, 'bg-success')
      return
    }
    if (game.phase === 'installing') {
      this.setLaunch(T.action.installing, 'download', 'default', true, T.stage[progress?.stage ?? 'metadata'], 'bg-primary')
      return
    }
    if (game.phase === 'launching') {
      this.setLaunch(T.action.launching, 'play', 'default', true, T.stage.launching, 'bg-primary')
      return
    }
    this.setLaunch(`${T.action.play} ${version}`.trim(), 'play', 'default', false, problems > 0 ? T.home.needsUpdate : T.home.ready, problems > 0 ? 'bg-warning' : 'bg-success')
  }

  private setLaunch(label: string, iconName: IconName, variant: 'default' | 'destructive', disabled: boolean, status: string, dot: string): void {
    this.launch.className = `${buttonClass(variant, 'lg')} min-w-56 flex-1`
    this.launch.disabled = disabled
    this.launch.replaceChildren(icon(iconName, 16), el('span', { text: label }))
    this.statusText.textContent = status
    this.statusDot.className = `size-2 rounded-full ${dot}`
  }

  private renderHeader(metadata: MetadataSummary | null, problems: number | null): void {
    if (!metadata) {
      this.header.replaceChildren(pageHeader('...'))
      return
    }
    const signature = metadata.fromCache ? badge(T.home.metadataCached, 'warning') : badge(T.home.metadataSigned, 'success')
    const integrity = problems === null ? null : problems === 0 ? badge(T.home.verified, 'success') : badge(T.home.problems(problems), 'warning')
    this.header.replaceChildren(pageHeader(metadata.pack.name, `${T.home.packVersion} ${metadata.pack.version} · ${T.home.releaseDate} ${releaseDate(metadata.pack.releaseDate)}`, signature, ...(integrity ? [integrity] : [])))
  }

  private renderChecks(account: string | null, problems: number | null, files: number): void {
    const check = (iconName: IconName, label: string, value: string, tone: string): HTMLElement => { return el('div', { class: 'flex items-center gap-3 border-t border-border py-2.5 text-sm first:border-t-0 first:pt-0' }, el('span', { class: tone }, icon(iconName, 16)), el('span', { class: 'text-muted-foreground', text: label }), el('span', { class: 'ml-auto truncate font-medium', text: value })) }
    this.checks.replaceChildren(
      check(account ? 'check' : 'alert', T.home.account, account ?? T.home.notSignedIn, account ? 'text-success' : 'text-warning'),
      check('shield', T.home.security, T.home.metadataSigned, 'text-success'),
      check(problems === null ? 'info' : problems === 0 ? 'shield' : 'alert', T.home.integrity, problems === null ? '--' : problems === 0 ? T.home.verified : T.home.problems(problems), problems === 0 ? 'text-success' : problems === null ? 'text-muted-foreground' : 'text-warning'),
      check('folder', T.home.files, String(files), 'text-muted-foreground')
    )
  }

  private renderDetails(metadata: MetadataSummary | null): void {
    if (!metadata) {
      this.details.replaceChildren()
      return
    }
    const { pack } = metadata
    const issuedAt = new Date(metadata.issuedAt).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric' })
    const expiresAt = new Date(metadata.expiresAt).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric' })
    this.details.replaceChildren(
      list(
        keyValue(T.home.packVersion, pack.version),
        keyValue(T.home.releaseDate, releaseDate(pack.releaseDate)),
        keyValue(T.home.files, String(pack.fileCount)),
        keyValue(T.home.security, metadata.fromCache ? T.home.metadataCached : T.home.metadataSigned, metadata.fromCache ? 'text-warning' : 'text-success'),
        keyValue('Metadata', `${issuedAt} → ${expiresAt}`, 'text-muted-foreground')
      )
    )
  }

  private renderLinks(metadata: MetadataSummary | null): void {
    const links = metadata?.links ?? []
    this.links.replaceChildren(links.length === 0 ? el('p', { class: 'text-sm text-muted-foreground', text: T.home.noLinks }) : list(
      ...links.map((link) => {
        return el(
          'button',
          { class: 'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-subtle', attrs: { type: 'button' }, on: { click: () => void this.app.openLink(link.url) } },
          el('span', { text: link.label }),
          el('span', { class: 'text-muted-foreground' }, icon('external', 14))
        )
      })
    ))
  }

  private renderNews(metadata: MetadataSummary | null): void {
    const items = (metadata?.news ?? []).slice(0, 4)
    this.news.replaceChildren(items.length === 0 ? el('p', { class: 'text-sm text-muted-foreground', text: T.home.noNews }) : list(...items.map((item) => this.newsRow(item))))
  }

  private newsRow(item: NewsItem): HTMLElement {
    const date = new Date(item.publishedAt).toLocaleDateString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric' })
    const thumbnail = contentImage(this.app, {
      url: item.coverImage,
      alt: item.title,
      className: 'size-14 shrink-0 rounded-md object-cover',
      fallbackClassName: 'flex size-14 shrink-0 items-center justify-center rounded-md bg-control text-muted-foreground'
    })
    return el(
      'button',
      {
        class: 'group flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-subtle',
        attrs: { type: 'button' },
        on: { click: () => this.app.go('updates') }
      },
      thumbnail,
      el(
        'span',
        { class: 'flex min-w-0 flex-1 flex-col gap-0.5' },
        el('span', { class: 'text-xs text-muted-foreground', text: date }),
        el('span', { class: 'truncate text-sm font-medium', text: item.title }),
        el('span', { class: 'line-clamp-1 text-sm text-muted-foreground', text: item.excerpt })
      ),
      el(
        'span',
        { class: 'text-muted-foreground transition-transform group-hover:translate-x-0.5' },
        icon('chevron', 16)
      )
    )
  }

  private renderFeatured(shop: readonly ShopItem[]): void {
    const item = shop.find((entry) => entry.featured) ?? shop[0]
    if (!item) {
      this.featured.replaceChildren()
      return
    }
    const image = contentImage(this.app, {
      url: item.images[0] ?? null,
      alt: item.title,
      className: 'size-12 shrink-0 rounded-md object-cover',
      fallbackClassName: 'flex size-12 shrink-0 items-center justify-center rounded-md bg-control text-muted-foreground'
    })
    this.featured.replaceChildren(
      el(
        'section',
        { class: 'card flex items-center gap-3 p-4' },
        image,
        el(
          'div',
          { class: 'min-w-0 flex-1' },
          el('p', { class: 'text-xs text-muted-foreground', text: T.home.featured }),
          el('p', { class: 'truncate text-sm font-semibold', text: item.title }),
          el('p', { class: 'mt-0.5 text-sm text-muted-foreground', text: item.price.display })
        ),
        el(
          'button',
          {
            class: buttonClass('secondary', 'sm'),
            attrs: { type: 'button' },
            on: { click: () => this.app.go('shop') },
            text: T.home.shopNow
          }
        )
      )
    )
  }

  private onLaunch(event: MouseEvent): void {
    const { accounts, game } = this.app.state.get()
    if (!accounts.some((account) => account.active)) {
      this.app.go('accounts')
      return
    }
    if (game.phase === 'running') {
      void this.app.stop()
      return
    }
    if (game.phase !== 'idle') return
    effects.burst(event.clientX, event.clientY, 14, 4)
    void this.app.play(false)
  }

  private openMenu(): void {
    const item = (label: string, iconName: IconName, action: () => void): HTMLButtonElement => {
      return el(
        'button',
        {
          class: MENU_ITEM,
          attrs: { type: 'button' },
          on: {
            click: () => {
              this.closeMenu()
              action()
            }
          }
        },
        icon(iconName, 16),
        el('span', { text: label })
      )
    }
    this.menu.replaceChildren(
      item(T.action.repair, 'wrench', () => void this.app.repair()),
      item(T.mods.recheck, 'refresh', () => void this.app.runAudit(true)),
      item(T.menu.verify, 'shield', () => void this.app.verifyActive()),
      item(T.menu.accounts, 'users', () => this.app.go('accounts'))
    )
    this.menu.classList.remove('hidden')
    this.menu.classList.add('flex')
    this.release = dismissOnOutside(this.menu.parentElement ?? this.menu, () => this.closeMenu())
  }

  private closeMenu(): void {
    this.release?.()
    this.release = null
    this.menu.classList.add('hidden')
    this.menu.classList.remove('flex')
  }
}