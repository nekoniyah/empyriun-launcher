import type { BrowserWindow } from 'electrobun/bun'
import type { WindowGuard } from './window-guard'

const MIN_GRAB_Y = 8
const MAX_GRAB_Y = 24

export class WindowDragger {
  private dragging = false
  private offsetX = 0
  private offsetY = 0

  constructor(
    private readonly window: BrowserWindow,
    private readonly guard: WindowGuard
  ) {}

  begin(pointerX: number, pointerY: number): void {
    const size = this.guard.size
    if (this.window.isMaximized() && size) {
      const before = this.window.getFrame()
      const ratio = before.width > 0 ? Math.min(1, Math.max(0, (pointerX - before.x) / before.width)) : 0.5
      this.offsetX = ratio * size.width
      this.offsetY = Math.min(MAX_GRAB_Y, Math.max(MIN_GRAB_Y, pointerY - before.y))
      this.window.unmaximize()
      this.window.setFrame(Math.round(pointerX - this.offsetX), Math.round(pointerY - this.offsetY), size.width, size.height)
    } else {
      const frame = this.window.getFrame()
      this.offsetX = pointerX - frame.x
      this.offsetY = pointerY - frame.y
    }
    this.dragging = true
  }

  move(pointerX: number, pointerY: number): void {
    if (!this.dragging) return
    this.window.setPosition(Math.round(pointerX - this.offsetX), Math.round(pointerY - this.offsetY))
  }

  end(): void {
    this.dragging = false
  }
}