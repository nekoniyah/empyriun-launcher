import { el } from '../lib/dom'
import { icon, type IconName } from '../lib/icons'

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'danger' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'iconSm'

const BASE = 'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  secondary: 'bg-secondary text-foreground hover:bg-secondary/70',
  outline: 'border border-input bg-transparent shadow-xs hover:bg-subtle',
  ghost: 'hover:bg-subtle',
  destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
  danger: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline'
}

const SIZES: Readonly<Record<ButtonSize, string>> = {
  default: 'h-9 px-4',
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  lg: 'h-10 px-6',
  icon: 'size-9',
  iconSm: 'size-8'
}

export function buttonClass(variant: ButtonVariant, size: ButtonSize = 'default'): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`
}

export const BUTTON_CLASSES: Readonly<Record<ButtonVariant, string>> = Object.fromEntries((Object.keys(VARIANTS) as ButtonVariant[]).map((variant) => [variant, buttonClass(variant)])) as Record<ButtonVariant, string>

export function button(label: string, iconName: IconName | null, variant: ButtonVariant, onClick: () => void, size: ButtonSize = 'default'): HTMLButtonElement {
  const element = el('button', { class: buttonClass(variant, size), attrs: { type: 'button' }, on: { click: onClick } })
  if (iconName) element.append(icon(iconName, size === 'sm' || size === 'iconSm' ? 14 : 16))
  if (label.length > 0) element.append(el('span', { text: label }))
  return element
}