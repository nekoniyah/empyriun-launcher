import type { AppController } from '../state/app-controller'

const THRESHOLD_PX = 4

export class WindowDragController {
  private pending = false
  private dragging = false
  private startX = 0
  private startY = 0
  private frame = 0
  private latest: { x: number, y: number } | null = null

  constructor(private readonly handle: HTMLElement, private readonly app: AppController) {
    handle.addEventListener('pointerdown', (event) => this.onDown(event))
    handle.addEventListener('pointermove', (event) => this.onMove(event))
    handle.addEventListener('pointerup', (event) => this.onUp(event))
    handle.addEventListener('pointercancel', (event) => this.onUp(event))
  }

  private scale(): number {
    return /Windows/i.test(navigator.userAgent) ? window.devicePixelRatio : 1
  }

  private onDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.app.state.get().maximized) return
    this.pending = true
    this.startX = event.screenX
    this.startY = event.screenY
    this.handle.setPointerCapture(event.pointerId)
  }

  private onMove(event: PointerEvent): void {
    if (!this.pending) return
    const x = event.screenX * this.scale()
    const y = event.screenY * this.scale()
    if (!this.dragging) {
      if (Math.hypot(event.screenX - this.startX, event.screenY - this.startY) < THRESHOLD_PX) return
      this.dragging = true
      this.app.bridge.dragBegin(x, y)
      return
    }
    this.latest = { x, y }
    if (!this.frame) this.frame = requestAnimationFrame(() => this.flush())
  }

  private flush(): void {
    this.frame = 0
    if (!this.latest) return
    this.app.bridge.dragMove(this.latest.x, this.latest.y)
    this.latest = null
  }

  private onUp(event: PointerEvent): void {
    if (this.dragging) this.app.bridge.dragEnd()
    if (this.handle.hasPointerCapture(event.pointerId)) this.handle.releasePointerCapture(event.pointerId)
    this.pending = false
    this.dragging = false
    this.latest = null
  }
}