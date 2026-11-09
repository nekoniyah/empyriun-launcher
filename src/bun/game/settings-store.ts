import { totalmem } from 'node:os'
import { rename, writeFile } from 'node:fs/promises'
import type { GameSettings, SettingsView } from '../../../shared/game'
import { LANGUAGES, SECRET_THEMES, THEMES, type Language, type Preferences, type ThemeId } from '../../../shared/preferences'
import { GameError } from '../core/game-error'

export interface StoredSettings extends GameSettings, Preferences {
  readonly unlocked: readonly ThemeId[]
}

const MIN_MB = 1024
const STEP_MB = 256
const HARD_MAX_MB = 32768
const PREFERRED_MB = 4096
const DEFAULT_THEME: ThemeId = 'system'

export class SettingsStore {
  constructor(private readonly file: string) {}

  view(settings: StoredSettings): SettingsView {
    const totalMb = Math.floor(totalmem() / 1048576)
    return { ...settings, jvm: (settings as SettingsView).jvm, minMb: MIN_MB, maxMb: this.maximum(totalMb), stepMb: STEP_MB, totalMb }
  }

  async load(): Promise<StoredSettings> {
    try {
      const raw = JSON.parse(await Bun.file(this.file).text()) as Record<string, unknown>
      const unlocked = Array.isArray(raw['unlocked']) ? raw['unlocked'].filter((value): value is ThemeId => typeof value === 'string' && (SECRET_THEMES as readonly string[]).includes(value)) : []
      const theme = SettingsStore.pick(raw['theme'], THEMES, DEFAULT_THEME)
      return {
        memoryMb: this.normalize(typeof raw['memoryMb'] === 'number' ? raw['memoryMb'] : PREFERRED_MB),
        language: SettingsStore.pick(raw['language'], LANGUAGES, SettingsStore.systemLanguage()),
        theme: SECRET_THEMES.includes(theme) && !unlocked.includes(theme) ? DEFAULT_THEME : theme,
        unlocked
      }
    } catch {
      return { memoryMb: this.normalize(PREFERRED_MB), language: SettingsStore.systemLanguage(), theme: DEFAULT_THEME, unlocked: [] }
    }
  }

  async save(patch: unknown): Promise<StoredSettings> {
    if (typeof patch !== 'object' || patch === null) throw new GameError('invalid_settings', 'Invalid settings.')
    const input = patch as Record<string, unknown>
    const current = await this.load()
    const unlock = input['unlock'] === undefined ? null : SettingsStore.choose(input['unlock'], SECRET_THEMES)
    const unlocked = unlock && !current.unlocked.includes(unlock) ? [...current.unlocked, unlock] : current.unlocked
    const theme = input['theme'] === undefined ? current.theme : SettingsStore.choose(input['theme'], THEMES)
    if (SECRET_THEMES.includes(theme) && !unlocked.includes(theme)) throw new GameError('invalid_settings', 'That theme is locked.')
    const next: StoredSettings = {
      memoryMb: input['memoryMb'] === undefined ? current.memoryMb : this.normalize(SettingsStore.finite(input['memoryMb'])),
      language: input['language'] === undefined ? current.language : SettingsStore.choose(input['language'], LANGUAGES),
      theme,
      unlocked
    }
    const temporary = `${this.file}.tmp`
    await writeFile(temporary, JSON.stringify(next, null, 2))
    await rename(temporary, this.file)
    return next
  }

  private normalize(value: number): number {
    const maximum = this.maximum(Math.floor(totalmem() / 1048576))
    return Math.min(maximum, Math.max(MIN_MB, Math.round(value / STEP_MB) * STEP_MB))
  }

  private maximum(totalMb: number): number {
    return Math.max(MIN_MB, Math.min(HARD_MAX_MB, Math.floor((totalMb * 0.75) / STEP_MB) * STEP_MB))
  }

  private static systemLanguage(): Language {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('fr') ? 'fr' : 'en'
  }

  private static pick<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
    return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallback
  }

  private static choose<T extends string>(value: unknown, options: readonly T[]): T {
    if (typeof value === 'string' && (options as readonly string[]).includes(value)) return value as T
    throw new GameError('invalid_settings', 'That setting value is not allowed.')
  }

  private static finite(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new GameError('invalid_settings', 'Memory must be a number.')
    return value
  }
}