import type { AppController } from '../state/app-controller'
import { ClassicEgg } from './classic-egg'
import { el } from './dom'
import { effects } from './effects'
import { CREEPER_PALETTE, creeperRows, drawSprite } from './sprites'
import { T } from './strings'

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const LOGO_CLICKS = 5
const LOGO_WINDOW_MS = 1600

export class EasterEggs {
  private progress = 0
  private typed = ''
  private clicks: number[] = []
  private readonly classic: ClassicEgg

  constructor(private readonly app: AppController) {
    this.classic = new ClassicEgg(app)
    document.addEventListener('keydown', (event) => this.onKey(event))
    app.logoClicks.on(({ x, y }) => this.onLogo(x, y))
  }

  private onKey(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).closest('input, textarea')) return
    const expected = KONAMI[this.progress]
    this.progress = expected !== undefined && event.key.toLowerCase() === expected.toLowerCase() ? this.progress + 1 : event.key === KONAMI[0] ? 1 : 0
    if (this.progress === KONAMI.length) {
      this.progress = 0
      this.cosmic(T.eggs.cosmicTitle)
    }
    if (event.key.length !== 1) return
    this.typed = `${this.typed}${event.key.toLowerCase()}`.slice(-16)
    if (this.typed.endsWith('creeper')) this.creeper()
    else if (this.typed.endsWith('herobrine')) this.herobrine()
    else if (this.typed.endsWith('nether')) this.nether()
    else if (this.typed.endsWith('empyrium')) this.app.achieve(T.eggs.magicTitle, 'check')
    else if (this.typed.endsWith('minecraft')) {
      this.typed = ''
      this.classic.arm()
    }
  }

  private onLogo(x: number, y: number): void {
    if (this.classic.handle(x, y)) return
    const now = performance.now()
    this.clicks = [...this.clicks.filter((time) => now - time < LOGO_WINDOW_MS), now]
    effects.burst(x, y, 10, 4)
    if (this.clicks.length < LOGO_CLICKS) return
    this.clicks = []
    this.cosmic(T.eggs.starsTitle)
  }

  private cosmic(title: string): void {
    document.body.classList.add('cosmic')
    effects.rain(5000)
    this.app.achieve(title, 'globe')
    setTimeout(() => document.body.classList.remove('cosmic'), 6000)
  }

  private nether(): void {
    this.typed = ''
    const overlay = el('div', { class: 'portal-overlay' })
    document.body.append(overlay)
    setTimeout(() => overlay.remove(), 3000)
    this.app.achieve(T.eggs.netherTitle, 'cube')
  }

  private herobrine(): void {
    this.typed = ''
    const eyes = el('div', { class: 'pointer-events-none fixed z-[88] flex gap-3 opacity-0 transition-opacity duration-700' }, el('span', { class: 'size-3 bg-white' }), el('span', { class: 'size-3 bg-white' }))
    eyes.style.left = `${40 + Math.random() * Math.max(1, window.innerWidth - 120)}px`
    eyes.style.top = `${40 + Math.random() * Math.max(1, window.innerHeight - 120)}px`
    document.body.append(eyes)
    requestAnimationFrame(() => (eyes.style.opacity = '1'))
    const follow = (event: PointerEvent): void => {
      const box = eyes.getBoundingClientRect()
      eyes.style.transform = `translate(${Math.sign(event.clientX - (box.left + box.width / 2)) * 3}px, ${Math.sign(event.clientY - (box.top + box.height / 2)) * 3}px)`
    }
    window.addEventListener('pointermove', follow)
    setTimeout(() => (eyes.style.opacity = '0'), 4200)
    setTimeout(() => {
      window.removeEventListener('pointermove', follow)
      eyes.remove()
    }, 5000)
    this.app.achieve(T.eggs.herobrineTitle, 'info')
  }

  private creeper(): void {
    this.typed = ''
    const canvas = document.createElement('canvas')
    canvas.className = 'pixelated pointer-events-none fixed bottom-6 z-[88]'
    canvas.style.left = '-70px'
    canvas.style.transition = 'left 3.4s linear, transform 1.1s ease-in'
    canvas.style.transformOrigin = 'bottom center'
    let frame: 0 | 1 = 0
    drawSprite(canvas, creeperRows(0), CREEPER_PALETTE, 5)
    document.body.append(canvas)
    const stride = setInterval(() => {
      frame = frame === 0 ? 1 : 0
      drawSprite(canvas, creeperRows(frame), CREEPER_PALETTE, 5)
    }, 180)
    requestAnimationFrame(() => requestAnimationFrame(() => (canvas.style.left = `${window.innerWidth * 0.55}px`)))
    let blink: ReturnType<typeof setInterval> | null = null
    setTimeout(() => {
      clearInterval(stride)
      this.app.notify('info', T.eggs.hiss)
      canvas.style.transform = 'scale(1.7)'
      blink = setInterval(() => (canvas.style.filter = canvas.style.filter ? '' : 'brightness(3)'), 140)
    }, 3500)
    setTimeout(() => {
      if (blink) clearInterval(blink)
      const box = canvas.getBoundingClientRect()
      canvas.remove()
      effects.burst(box.left + box.width / 2, box.top + box.height / 2, 90, 11)
      const root = document.getElementById('app')
      root?.classList.add('shake')
      setTimeout(() => root?.classList.remove('shake'), 1100)
      document.body.classList.add('dim')
      setTimeout(() => document.body.classList.remove('dim'), 220)
      this.app.achieve(T.eggs.creeperTitle, 'alert')
    }, 4800)
  }
}