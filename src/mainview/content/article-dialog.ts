import type { NewsItem } from '../../../shared/content'
import { el } from '../lib/dom'
import { T } from '../lib/strings'
import type { AppController } from '../state/app-controller'
import { contentImage } from './content-image'
import { markdown } from './markdown'

export class ArticleDialog {
  readonly element = el('div', { class: 'fixed inset-0 z-40 hidden items-center justify-center bg-black/65 p-6' })

  constructor(private readonly app: AppController) {
    this.element.addEventListener('click', (event) => { if (event.target === this.element) this.close() })
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.close() })
  }

  open(item: NewsItem): void {
    const date = new Date(item.publishedAt).toLocaleDateString(navigator.language, { year: 'numeric', month: 'long', day: 'numeric' })
    const content = el(
      'article',
      { class: 'article-dialog flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl' },
      el(
        'header',
        { class: 'flex items-start justify-between gap-5 border-b border-border px-6 py-5' },
        el(
          'div',
          { class: 'min-w-0' },
          el('p', {
            class: 'mb-2 text-xs font-medium text-muted-foreground',
            text: `${T.news.published} ${date}`
          }),
          el('h1', {
            class: 'text-2xl font-semibold tracking-tight',
            text: item.title
          })
        ),
        el(
          'button',
          {
            class: 'rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground',
            attrs: { type: 'button' },
            on: { click: () => this.close() },
            text: T.news.close
          }
        )
      ),
      el(
        'div',
        { class: 'article-content selectable overflow-y-auto px-6 py-6' },
        contentImage(this.app, {
          url: item.coverImage,
          alt: item.title,
          className: item.coverImage ? 'mb-6 max-h-80 w-full rounded-md object-cover' : 'hidden'
        }),
        el(
          'p',
          {
            class: 'mb-6 text-base leading-relaxed text-muted-foreground',
            text: item.excerpt
          }
        ),
        markdown(item.markdown, this.app),
        item.url ? el(
          'button',
          {
            class: 'mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
            attrs: { type: 'button' },
            on: { click: () => void this.app.openLink(item.url as string) },
            text: T.news.read
          }
        ) : null
      )
    )
    this.element.replaceChildren(content)
    this.element.classList.remove('hidden')
    this.element.classList.add('flex')
  }

  close(): void {
    this.element.classList.add('hidden')
    this.element.classList.remove('flex')
    this.element.replaceChildren()
  }
}