import { badge, pageBody, pageHeader, PAGE_SHELL, textInput } from '../lib/ui'
import type { MetadataSummary, ShopItem } from '../../../shared/content'
import type { AppController } from '../state/app-controller'
import { contentImage } from '../content/content-image'
import { markdown } from '../content/markdown'
import { button } from '../components/button'
import { T } from '../lib/strings'
import { el } from '../lib/dom'
import { View } from './view'

function price(item: ShopItem): HTMLElement {
  const current = el('span', { class: 'text-lg font-semibold', text: item.price.display })
  if (!item.compareAtPrice) return current
  return el('span', { class: 'flex flex-wrap items-center justify-end gap-2' }, current, el('span', { class: 'text-sm text-muted-foreground line-through', text: item.compareAtPrice.display }), badge(T.shop.discount, 'warning'))
}

function gallery(app: AppController, item: ShopItem): HTMLElement {
  const images = item.images.slice(0, 4)
  if (images.length === 0) return el('div', { class: 'flex h-44 items-center justify-center rounded-md bg-control text-sm text-muted-foreground', text: T.content.imageUnavailable })
  const main = contentImage(app, { url: images[0] ?? null, alt: item.title, className: 'h-44 w-full rounded-md object-cover', fallbackClassName: 'flex h-44 w-full items-center justify-center rounded-md bg-control text-sm text-muted-foreground' })
  if (images.length === 1) return main
  const dots = el('div', { class: 'absolute right-3 bottom-3 flex gap-1' })
  images.forEach((_, index) => dots.append(el('span', { class: index === 0 ? 'size-1.5 rounded-full bg-white' : 'size-1.5 rounded-full bg-white/45' })))
  return el('div', { class: 'relative' }, main, dots)
}

export class ShopView extends View {
  private metadata: MetadataSummary | null = null
  private query = ''
  private featuredOnly = false
  private readonly items = el('div', { class: 'grid grid-cols-2 gap-5' })
  private readonly toggle = el('button', { attrs: { type: 'button' } })

  constructor(private readonly app: AppController) {
    super(PAGE_SHELL)
    this.toggle.addEventListener('click', () => {
      this.featuredOnly = !this.featuredOnly
      this.render()
    })
    const search = textInput(T.shop.search, (value) => {
      this.query = value.trim().toLowerCase()
      this.render()
    }, 'max-w-xs')
    this.element.append(pageBody('max-w-5xl', pageHeader(T.shop.title), el('div', { class: 'flex items-center gap-3' }, search, this.toggle), this.items))
    this.bind(app.state, (state) => {
      if (state.metadata === this.metadata) return
      this.metadata = state.metadata
      this.render()
    })
  }

  private render(): void {
    this.toggle.className = this.featuredOnly ? 'inline-flex h-9 items-center rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary' : 'inline-flex h-9 items-center rounded-md border border-input px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground'
    this.toggle.textContent = T.shop.only
    const products = this.metadata?.shop ?? []
    const visible = products.filter((item) => {
      if (this.featuredOnly && !item.featured) return false
      const index = [item.title, item.category ?? '', item.tags.join(' '), item.descriptionMarkdown].join(' ').toLowerCase()
      return index.includes(this.query)
    }).sort((left, right) => {
      return (Number(right.featured) - Number(left.featured) || Number(right.available) - Number(left.available) || left.title.localeCompare(right.title))
    })
    this.items.replaceChildren(...(products.length === 0 ? [el('p', { class: 'col-span-2 text-sm text-muted-foreground', text: T.shop.empty })] : visible.length === 0 ? [el('p', {
      class: 'col-span-2 text-sm text-muted-foreground',
      text: T.shop.noMatch
    })] : visible.map((item) => this.product(item))))
  }

  private product(item: ShopItem): HTMLElement {
    const tags = item.tags.slice(0, 4)
    const description = el('div', { class: 'shop-markdown line-clamp-5 text-sm leading-relaxed text-muted-foreground' })
    description.append(markdown(item.descriptionMarkdown, this.app))
    return el(
      'article',
      { class: 'card flex flex-col gap-4 overflow-hidden p-5' },
      gallery(this.app, item),
      el(
        'div',
        { class: 'flex flex-col gap-3' },
        el(
          'div',
          { class: 'flex items-start justify-between gap-4' },
          el(
            'div',
            { class: 'min-w-0' },
            el(
              'div',
              { class: 'flex flex-wrap items-center gap-2' },
              el('h2', {
                class: 'truncate text-base font-semibold',
                text: item.title
              }),
              item.featured ? badge(T.shop.featured, 'primary') : null
            ),
            item.category ? el('p', {
              class: 'mt-1 text-xs text-muted-foreground',
              text: `${T.shop.category}: ${item.category}`
            }) : null
          ),
          item.available ? badge(T.shop.available, 'success') : badge(T.shop.unavailable, 'danger')
        ),
        description,
        tags.length > 0 ? el(
          'div',
          { class: 'flex flex-wrap gap-1.5' },
          ...tags.map((tag) => badge(tag, 'neutral'))
        ) : null,
        el(
          'div',
          { class: 'flex items-center justify-between gap-4 border-t border-border pt-4' },
          price(item),
          button(T.shop.buy, 'external', item.available ? 'default' : 'secondary', () => void this.app.openLink(item.url), 'sm')
        )
      )
    )
  }
}