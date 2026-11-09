import appConfig from '../../../app.config'
import { LANGUAGES, SECRET_THEMES, THEMES, type ThemeId } from '../../../shared/preferences'
import { field, keyValue, list, pageBody, pageHeader, PAGE_SHELL, segmented } from '../lib/ui'
import type { SettingsView as SettingsData } from '../../../shared/game'
import type { AppController, AppState } from '../state/app-controller'
import { ProgressBar } from '../components/progress-bar'
import { FlagList } from '../components/jvm-flag-list'
import { buttonClass } from '../components/button'
import { icon } from '../lib/icons'
import { T } from '../lib/strings'
import { el } from '../lib/dom'
import { View } from './view'

const PREVIEW: Readonly<Record<ThemeId, readonly [string, string, string]>> = {
  system: ['#0f0100', '#2c0807', '#d4af37'],
  cosmos: ['#121218', '#1a1a21', '#2fd16d'],
  obsidian: ['#0a0a0a', '#141414', '#f4f4f5'],
  ember: ['#15100e', '#1e1613', '#ff8a3d'],
  ocean: ['#0b111b', '#121a28', '#3d9bff'],
  forest: ['#0d130f', '#141d17', '#9be15d'],
  light: ['#f9f9fb', '#ffffff', '#1fa855'],
  classic: ['#2a1f14', '#2b2b2b', '#5ca03a']
}

export class SettingsView extends View {
  private rendered: SettingsData | null = null
  private readonly body = el('div', { class: 'flex flex-col gap-8' })
  private readonly repairBar = new ProgressBar()
  private readonly repairLabel = el('p', { class: 'text-xs text-muted-foreground' })
  private readonly repairBox = el('div', { class: 'hidden flex-col gap-2 px-4 pb-4' }, this.repairBar.element, this.repairLabel)
  private repairButton: HTMLButtonElement | null = null

  constructor(private readonly app: AppController) {
    super(PAGE_SHELL)
    this.element.append(pageBody('max-w-3xl', pageHeader(T.settings.title), this.body))
    this.bind(app.state, (state) => {
      if (state.settings !== this.rendered) {
        this.rendered = state.settings
        this.render(state.settings)
      }
      this.updateRepair(state)
    })
  }

  private render(settings: SettingsData | null): void {
    if (!settings) return this.body.replaceChildren()
    this.body.replaceChildren(
      this.group(T.settings.appearance, T.settings.appearanceNote, field(T.settings.language, T.settings.languageNote, segmented(LANGUAGES.map((value) => ({ value, label: T.languages[value] })), settings.language, (language) => void this.app.savePreferences({ language }))), this.themeRow(settings)),
      this.group(T.settings.game, T.settings.gameNote, this.memoryRow(settings)),
      this.group(T.settings.java, T.settings.javaNote, this.javaRow(settings)),
      this.group(T.settings.maintenance, null, this.repairRow(), field(T.mods.recheck, null, this.action(T.mods.recheck, 'refresh', () => void this.app.runAudit(true)))),
      this.group(T.settings.about, null, keyValue(appConfig.title, `v${appConfig.version}`), el('p', { class: 'px-4 py-3 text-sm text-muted-foreground', text: T.settings.aboutNote(appConfig.title, appConfig.version) }))
    )
  }

  private group(title: string, description: string | null, ...rows: Node[]): HTMLElement {
    return el('section', { class: 'flex flex-col gap-3' }, el('div', { class: 'flex flex-col gap-0.5' }, el('h2', { class: 'text-sm font-semibold', text: title }), description ? el('p', { class: 'text-sm text-muted-foreground', text: description }) : null), list(...rows))
  }

  private action(label: string, iconName: 'refresh' | 'wrench', onClick: () => void): HTMLButtonElement {
    return el('button', { class: buttonClass('outline', 'sm'), attrs: { type: 'button' }, on: { click: onClick } }, icon(iconName, 14), el('span', { text: label }))
  }

  private themeRow(settings: SettingsData): HTMLElement {
    const visible = THEMES.filter((theme) => !SECRET_THEMES.includes(theme) || settings.unlocked.includes(theme))
    const tiles = visible?.map((theme) => {
      const [background, surface, accent] = PREVIEW[theme]
      const swatch = el('span', { class: 'flex h-10 w-full items-end gap-1 overflow-hidden rounded-sm border border-border p-1.5' }, el('span', { class: 'h-full w-1/2 rounded-[2px]' }), el('span', { class: 'h-1/2 w-1/4 rounded-[2px]' }), el('span', { class: 'h-1/3 w-1/4 rounded-[2px]' }))
      swatch.style.background = background
      const [first, second, third] = Array.from(swatch.children) as HTMLElement[]
      if (first) first.style.background = surface
      if (second) second.style.background = accent
      if (third) third.style.background = accent
      const selected = theme === settings.theme
      return el('button', { class: `flex flex-col gap-1.5 rounded-md border p-1.5 text-left text-xs font-medium transition-colors ${selected ? 'border-ring ring-[3px] ring-ring/30' : 'border-border hover:bg-subtle'}`, attrs: { type: 'button' }, on: { click: () => void this.app.savePreferences({ theme }) } }, swatch, el('span', { class: 'px-0.5', text: T.themes[theme] }))
    })
    return el('div', { class: 'flex flex-col gap-3 p-4' }, el('div', { class: 'flex flex-col gap-0.5' }, el('p', { class: 'text-sm font-medium', text: T.settings.theme }), el('p', { class: 'text-sm text-muted-foreground', text: T.settings.themeNote })), el('div', { class: 'grid grid-cols-4 gap-2' }, ...tiles))
  }

  private memoryRow(settings: SettingsData): HTMLElement {
    const label = el('span', { class: 'w-14 text-right font-mono text-sm', text: SettingsView.format(settings.memoryMb) })
    const slider = el('input', { class: 'w-44', attrs: { type: 'range', min: String(settings.minMb), max: String(settings.maxMb), step: String(settings.stepMb), value: String(settings.memoryMb) } })
    slider.addEventListener('input', () => {
      label.textContent = SettingsView.format(Number(slider.value))
    })
    slider.addEventListener('change', () => void this.app.saveMemory(Number(slider.value)))
    return field(T.settings.memoryLabel, T.settings.memoryNote(SettingsView.format(settings.totalMb)), el('div', { class: 'flex items-center gap-3' }, slider, label))
  }

  private javaRow(settings: SettingsData): HTMLElement {
    if (settings.jvm?.length === 0) return el('p', { class: 'p-4 text-sm text-muted-foreground', text: T.settings.javaPending })
    return new FlagList(settings.jvm, settings.language, T.settings.sources).element
  }

  private repairRow(): HTMLElement {
    this.repairButton = this.action(T.settings.repair, 'wrench', () => void this.app.repair())
    return el('div', {}, field(T.settings.repair, T.settings.maintenanceNote, this.repairButton), this.repairBox)
  }

  private updateRepair({ game, progress }: AppState): void {
    const installing = game.phase === 'installing'
    if (this.repairButton) this.repairButton.disabled = game.phase !== 'idle'
    this.repairBox.classList.toggle('hidden', !installing)
    this.repairBox.classList.toggle('flex', installing)
    if (!installing) return
    this.repairBar.set(progress?.overall ?? 0)
    this.repairLabel.textContent = `${T.stage[progress?.stage ?? 'metadata']} ${Math.round((progress?.overall ?? 0) * 100)}%`
  }

  private static format(megabytes: number): string {
    return `${(megabytes / 1024).toFixed(megabytes % 1024 === 0 ? 0 : 2)} GB`
  }
}