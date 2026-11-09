import type { AppController, ViewId } from './state/app-controller'
import { AchievementHost } from './components/achievement-host'
import { CommandPalette } from './components/command-palette'
import { ProgressDock } from './components/progress-dock'
import { LoginDialog } from './components/login-dialog'
import { AccountsView } from './views/accounts-view'
import { SettingsView } from './views/settings-view'
import { ToastHost } from './components/toast-host'
import { Titlebar } from './components/titlebar'
import { NewsView } from './views/news-view'
import { PlayView } from './views/play-view'
import { ShopView } from './views/shop-view'
import { LogsView } from './views/logs-view'
import { Sidebar } from './components/sidebar'
import type { View } from './views/view'
import { el } from './lib/dom'

class ViewHost {
  private current: View | null = null

  constructor(private readonly host: HTMLElement, private readonly app: AppController) {
    this.app.view.subscribe((id) => this.show(id))
  }

  private show(id: ViewId): void {
    this.current?.destroy()
    this.current = this.create(id)
    this.host.replaceChildren(this.current.element)
  }

  private create(id: ViewId): View {
    if (id === 'updates') return new NewsView(this.app)
    if (id === 'accounts') return new AccountsView(this.app)
    if (id === 'settings') return new SettingsView(this.app)
    if (id === 'shop') return new ShopView(this.app)
    if (id === 'logs') return new LogsView(this.app)
    return new PlayView(this.app)
  }
}

export class Shell {
  constructor(private readonly root: HTMLElement, private readonly app: AppController) { }

  mount(): void {
    const content = el('main', { class: 'relative min-h-0 min-w-0 flex-1 overflow-hidden' })
    this.root.className = 'flex h-full flex-col bg-bg text-ink'
    this.root.append(
      new Titlebar(this.app).element,
      el('div', { class: 'flex min-h-0 flex-1' }, new Sidebar(this.app).element, content),
      new ToastHost(this.app).element,
      new LoginDialog(this.app).element,
      new ProgressDock(this.app).element,
      new CommandPalette(this.app).element,
      new AchievementHost(this.app).element,
    )
    new ViewHost(content, this.app)
  }
}