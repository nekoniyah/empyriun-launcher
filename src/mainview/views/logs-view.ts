import type { LogFile, LogGroup, LogMatch } from '../../../shared/logs'
import { button, buttonClass } from '../components/button'
import { el } from '../lib/dom'
import { icon } from '../lib/icons'
import { localeTag, T } from '../lib/strings'
import { INPUT } from '../lib/styles'
import { badge, textInput } from '../lib/ui'
import type { AppController } from '../state/app-controller'
import { View } from './view'

type Level = 'error' | 'warn' | 'info' | 'debug'

interface Row {
  readonly element: HTMLElement
  readonly text: string
  readonly level: Level
}

const MAX_ROWS = 4000
const POLL_MS = 1000
const LIST_EVERY = 5
const CONFIRM_MS = 3000
const SEARCH_DELAY_MS = 300
const LEVELS: readonly Level[] = ['error', 'warn', 'info', 'debug']
const GROUPS: readonly LogGroup[] = ['launcher', 'game', 'crash', 'archive']
const CLEARABLE: ReadonlySet<LogGroup> = new Set<LogGroup>(['crash', 'archive'])
const LIVE: ReadonlySet<string> = new Set(['launcher', 'game:latest.log', 'game:launcher-stdout.log', 'game:launcher-stderr.log', 'game:debug.log'])
const TEXT: Readonly<Record<Level, string>> = { error: 'text-destructive', warn: 'text-warning', info: 'text-foreground', debug: 'text-muted-foreground' }
const DOT: Readonly<Record<Level, string>> = { error: 'bg-destructive', warn: 'bg-warning', info: 'bg-success', debug: 'bg-muted-foreground' }
const TAG = /\/(FATAL|ERROR|WARN|INFO|DEBUG|TRACE)\]/
const FALLBACK: readonly (readonly [Level, RegExp])[] = [
  ['error', /\b(?:FATAL|ERROR|SEVERE|Exception)\b/],
  ['warn', /\b(?:WARN|WARNING)\b/],
  ['debug', /\b(?:DEBUG|TRACE)\b/]
]
const CONTINUATION = /^(?:\s|Caused by:|\.\.\. \d+ more)/
const STAMP = /^(\[\d{2}:\d{2}:\d{2}(?:\.\d+)?\])(\s*\[[^\]]*\])?(.*)$/

function classify(text: string, previous: Level): Level {
  if (CONTINUATION.test(text) && previous !== 'info') return previous
  const tagged = TAG.exec(text)?.[1]
  if (tagged) return tagged === 'FATAL' || tagged === 'ERROR' ? 'error' : tagged === 'WARN' ? 'warn' : tagged === 'INFO' ? 'info' : 'debug'
  for (const [level, pattern] of FALLBACK) if (pattern.test(text)) return level
  return 'info'
}

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
}

export class LogsView extends View {
  private readonly side = el('div', { class: 'flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2' })
  private readonly console = el('div', { class: 'selectable min-h-0 flex-1 overflow-y-auto bg-background/50 p-3 font-mono text-xs leading-5' })
  private readonly filter = el('input', { class: `${INPUT} min-w-0 flex-1`, attrs: { type: 'text', placeholder: T.logs.filter, spellcheck: 'false' } })
  private readonly count = el('span', { class: 'text-xs text-muted-foreground' })
  private readonly followButton = el('button', { attrs: { type: 'button' } })
  private readonly deleteButton = el('button', { attrs: { type: 'button' } })
  private readonly levelButtons = new Map<Level, HTMLButtonElement>()
  private readonly enabled = new Set<Level>(LEVELS)
  private rows: Row[] = []
  private entries: readonly LogFile[] = []
  private results: readonly LogMatch[] | null = null
  private query = ''
  private currentId: string | null = null
  private armed: string | null = null
  private armTimer: ReturnType<typeof setTimeout> | null = null
  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private offset = 0
  private carry = ''
  private lastLevel: Level = 'info'
  private follow = true
  private busy = false
  private tick = 0
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly app: AppController) {
    super('flex h-full animate-rise gap-4 p-6')
    const search = textInput(T.logs.search, (value) => this.onSearch(value))
    this.element.append(
      el('aside', { class: 'card flex w-72 shrink-0 flex-col overflow-hidden' }, el('div', { class: 'border-b border-border p-2' }, search), this.side),
      el('section', { class: 'card flex min-w-0 flex-1 flex-col overflow-hidden' }, this.toolbar(), this.console)
    )
    this.console.addEventListener('scroll', () => {
      const away = this.console.scrollHeight - this.console.scrollTop - this.console.clientHeight > 48
      if (away === this.follow) this.setFollow(!away)
    })
    this.setFollow(true)
    this.paintDelete()
    void this.refreshFiles(true)
    this.timer = setInterval(() => void this.onTick(), POLL_MS)
  }

  override destroy(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.armTimer) clearTimeout(this.armTimer)
    if (this.searchTimer) clearTimeout(this.searchTimer)
    super.destroy()
  }

  private toolbar(): HTMLElement {
    this.filter.addEventListener('input', () => this.applyFilters())
    for (const level of LEVELS) {
      const chip = el('button', { attrs: { type: 'button' }, on: { click: () => this.toggleLevel(level) } })
      this.levelButtons.set(level, chip)
      this.paintChip(level)
    }
    this.followButton.addEventListener('click', () => {
      this.setFollow(!this.follow)
      if (this.follow) this.scrollToEnd()
    })
    this.deleteButton.addEventListener('click', () => void this.deleteCurrent())
    const copy = button(T.logs.copy, 'copy', 'outline', () => void this.copyVisible(), 'sm')
    const clear = button(T.logs.clear, 'refresh', 'outline', () => this.clearRows(), 'sm')
    return el('div', { class: 'flex flex-wrap items-center gap-2 border-b border-border p-2' }, this.filter, ...this.levelButtons.values(), this.followButton, copy, clear, this.deleteButton, this.count)
  }

  private paintChip(level: Level): void {
    const chip = this.levelButtons.get(level)
    if (!chip) return
    chip.className = `flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${this.enabled.has(level) ? 'border-input text-foreground' : 'border-border text-muted-foreground opacity-60'}`
    chip.replaceChildren(el('span', { class: `size-1.5 rounded-full ${DOT[level]}` }), el('span', { text: T.logs.levels[level] }))
  }

  private setFollow(value: boolean): void {
    this.follow = value
    this.followButton.className = `flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-input text-muted-foreground'}`
    this.followButton.replaceChildren(icon('download', 14), el('span', { text: T.logs.follow }))
  }

  private paintDelete(): void {
    const armed = this.armed === this.currentId && this.currentId !== null
    this.deleteButton.className = buttonClass(armed ? 'destructive' : 'outline', 'sm')
    this.deleteButton.disabled = this.currentId === null
    this.deleteButton.replaceChildren(icon('trash', 14), el('span', { text: armed ? T.logs.confirmDelete : T.logs.delete }))
  }

  private arm(key: string): boolean {
    if (this.armed === key) {
      this.armed = null
      return true
    }
    this.armed = key
    if (this.armTimer) clearTimeout(this.armTimer)
    this.armTimer = setTimeout(() => {
      this.armed = null
      this.paintDelete()
      this.renderSide()
    }, CONFIRM_MS)
    return false
  }

  private async deleteCurrent(): Promise<void> {
    const id = this.currentId
    if (!id) return
    if (!this.arm(id)) {
      this.paintDelete()
      return
    }
    const result = await this.app.bridge.deleteLog(id)
    if (!result.ok) return void this.app.notify('error', result.error.message)
    this.app.notify('success', T.logs.deleted)
    this.currentId = null
    this.clearRows()
    await this.refreshFiles(true)
    this.paintDelete()
  }

  private async clearGroup(group: LogGroup): Promise<void> {
    if (!this.arm(`group:${group}`)) return this.renderSide()
    const result = await this.app.bridge.clearLogs(group)
    if (!result.ok) return void this.app.notify('error', result.error.message)
    this.app.notify('success', T.logs.clearedGroup(result.value))
    if (this.currentId && !this.entries.some((entry) => entry.id === this.currentId && entry.group !== group)) this.currentId = null
    await this.refreshFiles(true)
  }

  private onSearch(value: string): void {
    this.query = value.trim()
    if (this.searchTimer) clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(async () => {
      if (this.query.length < 2) {
        this.results = null
        return this.renderSide()
      }
      const result = await this.app.bridge.searchLogs(this.query)
      this.results = result.ok ? result.value : []
      this.renderSide()
    }, SEARCH_DELAY_MS)
  }

  private toggleLevel(level: Level): void {
    if (this.enabled.has(level)) this.enabled.delete(level)
    else this.enabled.add(level)
    this.paintChip(level)
    this.applyFilters()
  }

  private visible(row: Row): boolean {
    const query = this.filter.value.trim().toLowerCase()
    return this.enabled.has(row.level) && (query.length === 0 || row.text.toLowerCase().includes(query))
  }

  private applyFilters(): void {
    let shown = 0
    for (const row of this.rows) {
      const show = this.visible(row)
      row.element.classList.toggle('hidden', !show)
      if (show) shown += 1
    }
    this.count.textContent = T.logs.lines(shown)
  }

  private clearRows(): void {
    this.rows = []
    this.carry = ''
    this.console.replaceChildren()
    this.count.textContent = T.logs.lines(0)
  }

  private async copyVisible(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.rows.filter((row) => this.visible(row)).map((row) => row.text).join('\n'))
      this.app.notify('success', T.logs.copied)
    } catch {
      this.app.notify('info', T.dialog.copyManual)
    }
  }

  private scrollToEnd(): void {
    requestAnimationFrame(() => {
      this.console.scrollTop = this.console.scrollHeight
    })
  }

  private async onTick(): Promise<void> {
    this.tick += 1
    if (this.tick % LIST_EVERY === 0) await this.refreshFiles(false)
    if (this.currentId && LIVE.has(this.currentId)) await this.poll()
  }

  private async refreshFiles(select: boolean): Promise<void> {
    this.entries = await this.app.bridge.listLogs()
    this.renderSide()
    if (!select || this.currentId) return
    const preferred = this.entries.find((entry) => entry.id === 'game:latest.log') ?? this.entries.find((entry) => entry.id === 'launcher') ?? this.entries[0]
    if (preferred) await this.select(preferred.id)
    else this.paintDelete()
  }

  private renderSide(): void {
    if (this.results) {
      if (this.results.length === 0) return this.side.replaceChildren(el('p', { class: 'p-3 text-sm text-muted-foreground', text: T.logs.noResults }))
      return this.side.replaceChildren(el('p', { class: 'px-2 py-1.5 text-xs text-muted-foreground', text: T.logs.results(this.results.length) }), ...this.results.map((match) => this.resultButton(match)))
    }
    if (this.entries.length === 0) return this.side.replaceChildren(el('p', { class: 'p-3 text-sm text-muted-foreground', text: T.logs.empty }))
    const blocks: HTMLElement[] = []
    for (const group of GROUPS) {
      const members = this.entries.filter((entry) => entry.group === group)
      if (members.length === 0) continue
      const clearing = this.armed === `group:${group}`
      blocks.push(el('div', { class: 'flex items-center justify-between px-2 pt-3 pb-1' }, el('span', { class: 'text-xs font-medium text-muted-foreground', text: T.logs.groups[group] }), CLEARABLE.has(group) ? el('button', { class: `text-xs font-medium ${clearing ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`, attrs: { type: 'button' }, on: { click: () => void this.clearGroup(group) }, text: clearing ? T.logs.confirmDelete : T.logs.clear }) : null))
      for (const entry of members) blocks.push(this.fileButton(entry))
    }
    this.side.replaceChildren(...blocks)
  }

  private fileButton(entry: LogFile): HTMLElement {
    const active = entry.id === this.currentId
    const time = new Date(entry.modified).toLocaleString(localeTag(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return el('button', { class: `flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left transition-colors ${active ? 'bg-subtle' : 'hover:bg-subtle'}`, attrs: { type: 'button' }, on: { click: () => void this.select(entry.id) } }, el('span', { class: 'flex items-center gap-2 text-sm font-medium' }, el('span', { class: 'min-w-0 flex-1 truncate', text: entry.label }), LIVE.has(entry.id) ? el('span', { class: 'size-1.5 rounded-full bg-success', attrs: { title: T.logs.live } }) : null), el('span', { class: 'text-xs text-muted-foreground', text: `${formatSize(entry.size)} · ${time}` }))
  }

  private resultButton(match: LogMatch): HTMLElement {
    return el('button', { class: `flex flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors ${match.id === this.currentId ? 'bg-subtle' : 'hover:bg-subtle'}`, attrs: { type: 'button' }, on: { click: () => void this.openMatch(match) } }, el('span', { class: 'flex items-center gap-2 text-sm font-medium' }, el('span', { class: 'min-w-0 flex-1 truncate', text: match.label }), badge(String(match.count), 'primary')), ...match.samples.map((sample) => el('span', { class: 'truncate font-mono text-[11px] text-muted-foreground', text: sample })))
  }

  private async openMatch(match: LogMatch): Promise<void> {
    await this.select(match.id)
    this.filter.value = this.query
    this.applyFilters()
  }

  private async select(id: string): Promise<void> {
    this.currentId = id
    this.armed = null
    this.offset = 0
    this.lastLevel = 'info'
    this.clearRows()
    this.renderSide()
    this.paintDelete()
    await this.poll()
    if (!LIVE.has(id)) this.flushCarry()
  }

  private async poll(): Promise<void> {
    const id = this.currentId
    if (!id || this.busy) return
    this.busy = true
    try {
      for (let round = 0; round < 6; round += 1) {
        const result = await this.app.bridge.readLog(id, this.offset)
        if (this.currentId !== id) return
        if (!result.ok) return void this.app.notify('error', result.error.message)
        if (result.value.reset) this.clearRows()
        this.append(result.value.text)
        this.offset = result.value.next
        if (result.value.next >= result.value.size) break
      }
    } finally {
      this.busy = false
    }
  }

  private flushCarry(): void {
    if (this.carry.length === 0) return
    const pending = this.carry
    this.carry = ''
    this.append(`${pending}\n`)
  }

  private append(text: string): void {
    if (text.length === 0) return
    const parts = `${this.carry}${text}`.split('\n')
    this.carry = parts.pop() ?? ''
    const fragment = document.createDocumentFragment()
    for (const raw of parts) {
      const line = raw.replace(/\r$/, '')
      const level = classify(line, this.lastLevel)
      this.lastLevel = level
      const row: Row = { element: this.renderLine(line, level), text: line, level }
      row.element.classList.toggle('hidden', !this.visible(row))
      this.rows.push(row)
      fragment.append(row.element)
    }
    this.console.append(fragment)
    while (this.rows.length > MAX_ROWS) this.rows.shift()?.element.remove()
    this.applyFilters()
    if (this.follow) this.scrollToEnd()
  }

  private renderLine(line: string, level: Level): HTMLElement {
    const row = el('div', { class: `break-words whitespace-pre-wrap ${TEXT[level]}` })
    const match = STAMP.exec(line)
    if (!match) {
      row.textContent = line.length === 0 ? ' ' : line
      return row
    }
    row.append(el('span', { class: 'text-muted-foreground', text: match[1] ?? '' }), el('span', { class: 'text-primary/80', text: match[2] ?? '' }), el('span', { text: match[3] ?? '' }))
    return row
  }
}