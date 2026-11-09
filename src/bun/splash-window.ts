import { BrowserWindow } from 'electrobun/bun'

export type SplashReadyTrigger =
  | { readonly mode: 'timeout', readonly ms: number }
  | { readonly mode: 'event', readonly subscribe: (onReady: () => void) => void }
  | { readonly mode: 'manual' }

export interface SplashWindowOptions {
  readonly url: string
  readonly width?: number
  readonly height?: number
  readonly minDurationMs?: number
  readonly maxDurationMs?: number
  readonly transparent?: boolean
}

export interface ReadyGate {
  readonly ready: Promise<void>
  readonly markReady: () => void
}

export class SplashWindow {
  readonly window: BrowserWindow
  private readonly openedAt = Date.now()
  private closed = false
  private safetyTimer: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly options: SplashWindowOptions) {
    this.window = new BrowserWindow({
      title: '',
      url: options.url,
      frame: { x: 0, y: 0, width: options.width ?? 420, height: options.height ?? 260 },
      titleBarStyle: 'hidden',
      transparent: options.transparent ?? true
    })
    if (options.maxDurationMs) {
      this.safetyTimer = setTimeout(() => void this.close(), options.maxDurationMs)
    }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    if (this.safetyTimer) clearTimeout(this.safetyTimer)
    const elapsed = Date.now() - this.openedAt
    const remaining = (this.options.minDurationMs ?? 0) - elapsed
    if (remaining > 0) await new Promise<void>((resolve) => setTimeout(resolve, remaining))
    this.window.close()
  }
}

export function createReadyGate(trigger: SplashReadyTrigger): ReadyGate {
  let resolveReady!: () => void
  const ready = new Promise<void>((resolve) => { resolveReady = resolve })
  if (trigger.mode === 'timeout') setTimeout(resolveReady, trigger.ms)
  if (trigger.mode === 'event') trigger.subscribe(resolveReady)
  return { ready, markReady: resolveReady }
}