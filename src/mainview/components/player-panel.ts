import type { AccountSummary } from '../../../shared/auth'
import { defaultSource } from '../lib/default-skin'
import { el } from '../lib/dom'
import { effects } from '../lib/effects'
import { T } from '../lib/strings'
import { SkinViewer } from '../skin/skin-viewer'
import type { AppController } from '../state/app-controller'

export class PlayerPanel {
  readonly element = el('section', { class: 'card relative flex h-80 flex-col overflow-hidden' })
  private readonly viewer = new SkinViewer({ onPoke: (x, y) => effects.burst(x, y, 10, 4) })
  private readonly name = el('p', { class: 'truncate text-sm font-semibold' })
  private readonly hint = el('p', { class: 'text-xs text-muted-foreground' })
  private key = ''

  constructor(private readonly app: AppController) {
    this.viewer.element.className = 'absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing'
    this.element.append(el('div', { class: 'relative min-h-0 flex-1' }, this.viewer.element), el('div', { class: 'flex flex-col gap-0.5 border-t border-border px-4 py-3' }, this.name, this.hint))
    app.state.subscribe((state) => void this.update(state.accounts.find((account) => account.active) ?? null))
  }

  dispose(): void {
    this.viewer.dispose()
  }

  private async update(active: AccountSummary | null): Promise<void> {
    const key = active?.id ?? 'default'
    if (key === this.key) return
    this.key = key
    this.name.textContent = active?.name ?? T.player.default
    this.hint.textContent = this.viewer.supported ? T.player.hint : T.player.unsupported
    const fetched = active ? await this.app.ensureSkin(active.id) : null
    if (this.key !== key) return
    await this.viewer.load(fetched?.skin ? { skin: fetched.skin, cape: fetched.cape, slim: fetched.slim } : defaultSource()).catch(() => undefined)
  }
}