import appConfig from '../../app.config'

const FOCUS_MESSAGE = 'focus'
const PORT_BASE = 20000
const PORT_RANGE = 20000

class SingleInstanceGuard {
  private focusHandler: (() => void) | null = null
  private server: { stop(closeActiveConnections?: boolean): void } | null = null

  setFocusHandler(handler: () => void): void {
    this.focusHandler = handler
  }

  async acquire(): Promise<boolean> {
    if (!appConfig.singleInstance) return true
    const port = SingleInstanceGuard.derivePort(appConfig.identifier)
    try {
      this.server = Bun.listen({
        port,
        hostname: '127.0.0.1',
        socket: {
          data: (_socket, data) => {
            if (data.toString() === FOCUS_MESSAGE) this.focusHandler?.()
          }
        }
      })
      return true
    } catch {
      await SingleInstanceGuard.notifyPrimary(port)
      return false
    }
  }

  release(): void {
    this.server?.stop(true)
    this.server = null
  }

  private static async notifyPrimary(port: number): Promise<void> {
    try {
      await Bun.connect({
        port,
        hostname: '127.0.0.1',
        socket: {
          open: (socket) => {
            socket.write(FOCUS_MESSAGE)
            socket.end()
          },
          data: () => undefined
        }
      })
    } catch (error) {
      console.error('Single-instance lock could not reach the primary instance', error)
    }
  }

  private static derivePort(identifier: string): number {
    let hash = 0
    for (let index = 0; index < identifier.length; index += 1) hash = (hash * 31 + identifier.charCodeAt(index)) | 0
    return PORT_BASE + (Math.abs(hash) % PORT_RANGE)
  }
}

const guard = new SingleInstanceGuard()

export function onFocusRequest(handler: () => void): void {
  guard.setFocusHandler(handler)
}

export function acquireSingleInstanceLock(): Promise<boolean> {
  return guard.acquire()
}

export function releaseSingleInstanceLock(): void {
  guard.release()
}