import type { MetadataSummary, NewsItem } from '../../../shared/content'
import { ArticleDialog } from '../content/article-dialog'
import { contentImage } from '../content/content-image'
import { el } from '../lib/dom'
import { localeTag, T } from '../lib/strings'
import { badge, pageBody, pageHeader, PAGE_SHELL } from '../lib/ui'
import type { AppController } from '../state/app-controller'
import { View } from './view'

export class NewsView extends View {
  private rendered: MetadataSummary | null | undefined
  private readonly feed = el('div', { class: 'grid grid-cols-2 gap-5' })
  private readonly dialog: ArticleDialog

  constructor(private readonly app: AppController) {
    super(PAGE_SHELL)
    this.dialog = new ArticleDialog(app)
    this.element.append(pageBody('max-w-5xl', pageHeader(T.news.title), this.feed), this.dialog.element)
    this.bind(app.state, (state) => {
      if (state.metadata === this.rendered) return
      this.rendered = state.metadata
      const items = [...(state.metadata?.news ?? [])].sort((left, right) => { return (Number(right.featured) - Number(left.featured) || Date.parse(right.publishedAt) - Date.parse(left.publishedAt)) })
      if (items.length === 0) {
        this.feed.replaceChildren(el('p', { class: 'col-span-2 text-sm text-muted-foreground', text: T.home.noNews }))
        return
      }
      this.feed.replaceChildren(...items.map((item, index) => this.article(item, index === 0)))
    })
  }

  override destroy(): void {
    this.dialog.close()
    super.destroy()
  }

  private article(item: NewsItem, featured: boolean): HTMLElement {
    const date = new Date(item.publishedAt).toLocaleDateString(localeTag(), { year: 'numeric', month: 'long', day: 'numeric' })
    const image = contentImage(this.app, {
      url: item.coverImage,
      alt: item.title,
      className: featured ? 'h-56 w-full rounded-md object-cover' : 'h-40 w-full rounded-md object-cover',
      fallbackClassName: featured ? 'flex h-56 w-full items-center justify-center rounded-md bg-control text-sm text-muted-foreground' : 'flex h-40 w-full items-center justify-center rounded-md bg-control text-sm text-muted-foreground'
    })
    return el(
      'article',
      { class: featured ? 'card col-span-2 overflow-hidden p-5' : 'card overflow-hidden p-5' },
      image,
      el(
        'div',
        { class: 'flex flex-col gap-3 pt-4' },
        el(
          'div',
          { class: 'flex items-center justify-between gap-3' },
          el(
            'time',
            {
              class: 'text-xs text-muted-foreground',
              text: date
            }
          ),
          item.featured ? badge(T.news.featured, 'primary') : null
        ),
        el('h2', {
          class: featured ? 'text-xl font-semibold tracking-tight' : 'text-base font-semibold',
          text: item.title
        }),
        el('p', {
          class: 'text-sm leading-relaxed text-muted-foreground',
          text: item.excerpt
        }),
        el(
          'button',
          {
            class: 'w-fit text-sm font-medium text-primary transition-colors hover:text-primary/80',
            attrs: { type: 'button' },
            on: { click: () => this.dialog.open(item) },
            text: T.news.read
          }
        )
      )
    )
  }
}