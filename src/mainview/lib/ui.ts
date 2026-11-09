import { el } from './dom'
import { INPUT } from './styles';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const TONES: Readonly<Record<Tone, string>> = {
  neutral: 'border-border text-muted-foreground',
  primary: 'border-primary/30 bg-primary/10 text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive'
}

export function badge(text: string, tone: Tone = 'neutral'): HTMLElement {
  return el('span', { class: `inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium ${TONES[tone]}`, text })
}

export function kbd(text: string): HTMLElement {
  return el('kbd', { class: 'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-control px-1 font-mono text-[10px] font-medium text-muted-foreground', text })
}

export function separator(): HTMLElement {
  return el('div', { class: 'h-px w-full bg-border' })
}

export function pageHeader(title: string, description?: string, ...actions: Node[]): HTMLElement {
  return el(
    'header',
    { class: 'flex items-start justify-between gap-4' },
    el('div', { class: 'flex flex-col gap-1' }, el('h1', { class: 'heading text-2xl', text: title }), description ? el('p', { class: 'text-sm text-muted-foreground', text: description }) : null),
    actions.length > 0 ? el('div', { class: 'flex shrink-0 items-center gap-2' }, ...actions) : null
  )
}

export function sectionHeader(title: string, action?: Node): HTMLElement {
  return el('div', { class: 'flex items-center justify-between' }, el('h2', { class: 'text-sm font-semibold', text: title }), action ?? null)
}

export function list(...rows: Node[]): HTMLElement {
  return el('div', { class: 'card divide-y divide-border overflow-hidden' }, ...rows)
}

export function keyValue(label: string, value: string, tone: string = ''): HTMLElement {
  return el('div', { class: 'flex items-center justify-between gap-4 px-4 py-2.5 text-sm' }, el('span', { class: 'text-muted-foreground', text: label }), el('span', { class: `truncate font-medium ${tone}`, text: value }))
}

export const PAGE_SHELL = 'flex h-full animate-rise flex-col overflow-y-auto'

export function pageBody(width: string, ...children: Node[]): HTMLElement {
  return el('div', { class: `mx-auto flex w-full ${width} flex-col gap-6 p-8` }, ...children)
}

export function field(label: string, description: string | null, control: Node): HTMLElement {
  return el(
    'div',
    { class: 'flex items-center justify-between gap-6 px-4 py-4' },
    el('div', { class: 'flex min-w-0 flex-col gap-0.5' }, el('p', { class: 'text-sm font-medium', text: label }), description ? el('p', { class: 'text-sm text-muted-foreground', text: description }) : null),
    el('div', { class: 'shrink-0' }, control)
  )
}

export function textInput(placeholder: string, onInput: (value: string) => void, extra: string = ''): HTMLInputElement {
  const input = el('input', { class: `${INPUT} ${extra}`, attrs: { type: 'text', placeholder, spellcheck: 'false', autocomplete: 'off' } })
  input.addEventListener('input', () => onInput(input.value))
  return input
}

export function segmented<T extends string>(options: readonly { readonly value: T; readonly label: string }[], current: T, onSelect: (value: T) => void): HTMLElement {
  return el(
    'div',
    { class: 'inline-flex rounded-md bg-control p-0.5' },
    ...options.map((option) => el('button', { class: `h-7 rounded px-3 text-sm font-medium transition-colors ${option.value === current ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`, attrs: { type: 'button' }, on: { click: () => onSelect(option.value) }, text: option.label }))
  )
}