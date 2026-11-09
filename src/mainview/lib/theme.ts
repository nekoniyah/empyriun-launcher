import type { ThemeId } from '../../../shared/preferences'
import { installClassicTextures } from './classic-textures'

class ThemeManager {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)')
  private choice: ThemeId = 'system'

  constructor() {
    this.media.addEventListener('change', () => this.apply())
  }

  set(theme: ThemeId): void {
    this.choice = theme
    this.apply()
  }

  private apply(): void {
    const resolved = this.choice === 'system' ? (this.media.matches ? 'dark' : 'light') : this.choice
    if (resolved === 'classic') installClassicTextures()
    document.documentElement.dataset['theme'] = resolved
  }
}

export const themes = new ThemeManager()