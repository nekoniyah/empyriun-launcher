export const LANGUAGES = ['fr', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export const THEMES = ['system', 'cosmos', 'obsidian', 'ember', 'ocean', 'forest', 'light', 'classic'] as const
export type ThemeId = (typeof THEMES)[number]
export const SECRET_THEMES: readonly ThemeId[] = ['classic']

export interface Preferences {
  readonly language: Language
  readonly theme: ThemeId
}