import { el } from '../lib/dom'
import { loadImage } from '../skin/image'
import type { AppController } from '../state/app-controller'

export function skinHead(app: AppController, accountId: string | null, size: number, name: string): HTMLElement {
  const holder = el('span', { class: 'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-sm font-semibold text-primary-foreground', text: name.slice(0, 1).toUpperCase() })
  holder.style.width = `${size}px`
  holder.style.height = `${size}px`
  if (!accountId) return holder
  void app.ensureSkin(accountId).then(async (skin) => {
    if (!skin?.skin) return
    const image = await loadImage(skin.skin)
    const scale = image.width / 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.className = 'pixelated size-full'
    const context = canvas.getContext('2d')
    if (!context) return
    context.imageSmoothingEnabled = false
    context.drawImage(image, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size)
    context.drawImage(image, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, size, size)
    holder.replaceChildren(canvas)
  }).catch(() => undefined)
  return holder
}