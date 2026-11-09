import type { BrowserWindow } from 'electrobun/bun'

export interface WindowSize {
  readonly width: number
  readonly height: number
}

const SETTLE_MS = 80
const COOLDOWN_MS = 150
const TOLERANCE_PX = 1

export class WindowGuard {
  private baseline: WindowSize | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private cooldownUntil = 0

  constructor(private readonly window: BrowserWindow) {}

  get size(): WindowSize | null {
    return this.baseline
  }

  install(): void {
    const frame = this.window.getFrame()
    this.baseline = { width: frame.width, height: frame.height }
    this.window.on('resize', () => this.schedule())
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.enforce(), SETTLE_MS)
  }

  private enforce(): void {
    this.timer = null
    if (!this.baseline || this.window.isMaximized()) return
    if (Date.now() < this.cooldownUntil) return this.schedule()
    const frame = this.window.getFrame()
    if (Math.abs(frame.width - this.baseline.width) <= TOLERANCE_PX && Math.abs(frame.height - this.baseline.height) <= TOLERANCE_PX) return
    this.cooldownUntil = Date.now() + COOLDOWN_MS
    this.window.setSize(this.baseline.width, this.baseline.height)
  }
}