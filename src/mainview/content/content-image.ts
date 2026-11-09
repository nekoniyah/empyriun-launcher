import type { AppController } from '../state/app-controller'
import { el } from '../lib/dom'
import { T } from '../lib/strings'

export interface ContentImageOptions {
  readonly url: string | null
  readonly alt: string
  readonly className: string
  readonly fallbackClassName?: string
}

export function contentImage(app: AppController, options: ContentImageOptions): HTMLElement {
  const placeholder = el('span', { class: options.fallbackClassName ?? 'flex items-center justify-center bg-control text-xs text-muted-foreground' }, document.createTextNode(T.content.imageUnavailable))
  if (!options.url) {
    placeholder.className = options.className
    return placeholder
  }
  placeholder.className = options.className
  void app.ensureContentImage(options.url).then((image) => {
    if (!image) return
    const element = el('img', {
      class: options.className,
      attrs: {
        src: image.dataUri,
        alt: options.alt,
        draggable: 'false'
      }
    })
    placeholder.replaceWith(element)
  }).catch(() => undefined)
  return placeholder
}