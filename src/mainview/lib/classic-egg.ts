import type { AppController } from '../state/app-controller'
import { grassBlockCanvas, textureCanvas } from './classic-textures'
import { el } from './dom'
import { effects } from './effects'
import { T } from './strings'

type Stage = 'dormant' | 'armed' | 'collecting' | 'done'

interface Drop {
  readonly element: HTMLButtonElement
  x: number
  y: number
  vx: number
  vy: number
  resting: boolean
}

const HITS = 10
const HIT_WINDOW_MS = 3000
const COLLECT_MS = 9000
const GRAVITY = 0.6
const DROPS: readonly (readonly [number, number, number, number])[] = [
  [134, 96, 67, 1],
  [128, 128, 128, 2],
  [157, 128, 79, 3]
]

export class ClassicEgg {
  private stage: Stage = 'dormant'
  private hits = 0
  private hitTimer: ReturnType<typeof setTimeout> | null = null
  private drops: Drop[] = []
  private collected = 0
  private logo: HTMLElement | null = null
  private original: ChildNode[] = []
  private block: HTMLCanvasElement | null = null
  private cracks: HTMLCanvasElement | null = null
  private frame = 0

  constructor(private readonly app: AppController) {}

  arm(): void {
    if (this.stage !== 'dormant') return
    const logo = document.getElementById('brand-logo')
    if (!logo) return
    this.logo = logo
    this.original = Array.from(logo.childNodes)
    this.stage = 'armed'
    this.showBlock()
    this.app.achieve(T.eggs.blockTitle, 'cube')
  }

  handle(x: number, y: number): boolean {
    if (this.stage !== 'armed') return this.stage === 'collecting'
    this.hit(x, y)
    return true
  }

  private showBlock(): void {
    if (!this.logo) return
    const block = grassBlockCanvas()
    block.className = 'pixelated size-8'
    const cracks = document.createElement('canvas')
    cracks.width = 16
    cracks.height = 16
    cracks.className = 'pixelated pointer-events-none absolute inset-0 size-8'
    const holder = el('span', { class: 'relative block size-8' }, block, cracks)
    this.block = block
    this.cracks = cracks
    this.logo.replaceChildren(holder)
  }

  private restoreLogo(): void {
    this.logo?.replaceChildren(...this.original)
    this.block = null
    this.cracks = null
  }

  private hit(x: number, y: number): void {
    this.hits += 1
    effects.burst(x, y, 6, 3)
    this.logo?.classList.remove('tap')
    void this.logo?.getBoundingClientRect()
    this.logo?.classList.add('tap')
    if (this.hitTimer) clearTimeout(this.hitTimer)
    this.hitTimer = setTimeout(() => {
      this.hits = 0
      this.drawCracks()
    }, HIT_WINDOW_MS)
    this.drawCracks()
    if (this.hits >= HITS) this.breakBlock(x, y)
  }

  private drawCracks(): void {
    const context = this.cracks?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, 16, 16)
    context.fillStyle = 'rgba(0,0,0,0.62)'
    const total = Math.floor((this.hits / HITS) * 44)
    let state = 77
    for (let index = 0; index < total; index += 1) {
      state = (state * 1664525 + 1013904223) % 4294967296
      const px = state % 16
      state = (state * 1664525 + 1013904223) % 4294967296
      context.fillRect(px, state % 16, 1, 1)
    }
  }

  private breakBlock(x: number, y: number): void {
    if (this.hitTimer) clearTimeout(this.hitTimer)
    this.stage = 'collecting'
    this.collected = 0
    effects.burst(x, y, 40, 8)
    this.block?.classList.add('opacity-0')
    this.cracks?.getContext('2d')?.clearRect(0, 0, 16, 16)
    this.drops = DROPS.map(([r, g, b, seed], index) => this.spawn(x, y, r, g, b, seed, index))
    this.frame = requestAnimationFrame(() => this.tick())
    setTimeout(() => this.expire(), COLLECT_MS)
  }

  private spawn(x: number, y: number, r: number, g: number, b: number, seed: number, index: number): Drop {
    const canvas = textureCanvas([r, g, b], 40, seed)
    canvas.className = 'pixelated size-full'
    const element = el('button', { class: 'fixed z-[89] size-8 border-2 border-black transition-transform hover:scale-125', attrs: { type: 'button', 'aria-label': T.eggs.blockTitle } }, canvas)
    document.body.append(element)
    const drop: Drop = { element, x, y, vx: (index - 1) * 3.2 + (Math.random() - 0.5), vy: -9 - Math.random() * 3, resting: false }
    element.addEventListener('click', () => this.collect(drop))
    return drop
  }

  private tick(): void {
    const floor = window.innerHeight - 52
    let moving = false
    for (const drop of this.drops) {
      if (drop.resting) continue
      drop.vy += GRAVITY
      drop.x += drop.vx
      drop.y += drop.vy
      drop.vx *= 0.985
      if (drop.y >= floor) {
        drop.y = floor
        drop.vy = -drop.vy * 0.45
        drop.vx *= 0.8
        if (Math.abs(drop.vy) < 1.2) drop.resting = true
      }
      drop.x = Math.max(8, Math.min(window.innerWidth - 40, drop.x))
      drop.element.style.left = `${drop.x}px`
      drop.element.style.top = `${drop.y}px`
      moving = true
    }
    if (moving && this.stage === 'collecting') this.frame = requestAnimationFrame(() => this.tick())
  }

  private collect(drop: Drop): void {
    if (!this.drops.includes(drop)) return
    this.drops = this.drops.filter((item) => item !== drop)
    this.collected += 1
    const target = this.logo?.getBoundingClientRect()
    drop.element.style.transition = 'left 0.4s ease-in, top 0.4s ease-in, transform 0.4s ease-in'
    drop.element.style.left = `${target ? target.left + 4 : 16}px`
    drop.element.style.top = `${target ? target.top + 4 : 16}px`
    drop.element.style.transform = 'scale(0.4)'
    setTimeout(() => drop.element.remove(), 420)
    if (this.collected === DROPS.length) void this.finish()
  }

  private expire(): void {
    if (this.stage !== 'collecting' || this.collected === DROPS.length) return
    cancelAnimationFrame(this.frame)
    for (const drop of this.drops) drop.element.remove()
    this.drops = []
    this.hits = 0
    this.stage = 'armed'
    this.block?.classList.remove('opacity-0')
    this.app.notify('info', T.eggs.dropsLost)
  }

  private async finish(): Promise<void> {
    this.stage = 'done'
    cancelAnimationFrame(this.frame)
    effects.burst(window.innerWidth / 2, window.innerHeight / 2, 80, 10)
    this.restoreLogo()
    await this.app.unlockClassic()
  }
}