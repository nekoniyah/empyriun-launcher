import { Tray, Utils } from 'electrobun/bun'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import appConfig, { type TrayMenuItem } from '../../app.config'
import { ICON_ICO_BASE64, ICON_PNG_BASE64 } from './generated/brand'

type TrayMenuEntry = Parameters<Tray['setMenu']>[0][number]

const BUILTIN: ReadonlySet<string> = new Set(['show-window', 'quit'])
const WINDOWS_USES_ICO = true

export class TrayController {
  private tray: Tray | null = null

  constructor(private readonly directory: string, private readonly show: () => void, private readonly forward: (action: string) => void) { }

  create(): void {
    if (!appConfig.tray.enabled || this.tray) return
    try {
      this.tray = new Tray({ title: appConfig.tray.tooltip, image: this.materialize(), template: true, width: 32, height: 32 })
      this.tray.setMenu(TrayController.menu(appConfig.tray.menu))
      this.tray.on('tray-clicked', (event: unknown) => this.handle(TrayController.action(event)))
    } catch (error) {
      console.error('Tray could not be created', error)
      this.tray = null
    }
  }

  destroy(): void {
    try { this.tray?.remove() } catch (error) { console.error('Tray removal failed', error) }
    this.tray = null
  }

  private materialize(): string {
    mkdirSync(this.directory, { recursive: true })
    const windows = process.platform === 'win32' && WINDOWS_USES_ICO
    const file = join(this.directory, windows ? 'tray.ico' : 'tray.png')
    writeFileSync(file, Buffer.from(windows ? ICON_ICO_BASE64 : ICON_PNG_BASE64, 'base64'))
    return file
  }

  private handle(action: string | null): void {
    if (!action) return
    if (action === 'show-window') return this.show()
    if (action === 'quit') return void Utils.quit()
    if (!BUILTIN.has(action)) this.forward(action)
  }

  private static action(event: unknown): string | null {
    const data = typeof event === 'object' && event !== null ? (event as { data?: unknown }).data : null
    const action = typeof data === 'object' && data !== null ? (data as { action?: unknown }).action : null
    return typeof action === 'string' && action.length > 0 ? action : null
  }

  private static menu(items: readonly TrayMenuItem[]): TrayMenuEntry[] {
    return items.map((item): TrayMenuEntry => (item.type === 'divider' ? ({ type: 'divider' } as TrayMenuEntry) : ({ type: 'normal', label: item.label ?? '', action: item.action } as TrayMenuEntry)))
  }
}