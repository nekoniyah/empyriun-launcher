import { CATEGORY_LABELS, describeFlag, groupArguments, type FlagInfo, type FlagSource, type JvmArgument } from '../../../shared/jvm-flags'
import type { Language } from '../../../shared/preferences'
import { el } from '../lib/dom'

const SOURCE_CLASSES: Readonly<Record<FlagSource, string>> = {
  launcher: 'border-primary/40 bg-primary/10 text-primary',
  minecraft: 'border-border bg-control text-muted-foreground',
  loader: 'border-ring/40 bg-ring/10 text-foreground',
  pack: 'border-warning/40 bg-warning/10 text-warning'
}

export class FlagList {
  readonly element = el('div', { class: 'flex flex-wrap gap-1.5 p-4' })
  private static card: HTMLElement | null = null

  constructor(args: readonly JvmArgument[], private readonly language: Language, private readonly labels: Readonly<Record<FlagSource, string>>) {
    for (const argument of groupArguments(args)) {
      const info = describeFlag(argument.value, language)
      const short = argument.value.length > 64 ? `${argument.value.slice(0, 61)}…` : argument.value
      const show = (event: Event): void => this.show(event.currentTarget as HTMLElement, argument, info)
      this.element.append(el('button', {
        class: `max-w-full truncate rounded-md border px-2 py-1 text-left font-mono text-xs transition-colors hover:brightness-125 focus-visible:ring-[3px] focus-visible:ring-ring/50 ${SOURCE_CLASSES[argument.source]}`,
        attrs: { type: 'button' },
        text: short,
        on: { mouseenter: show, focus: show, mouseleave: () => FlagList.hide(), blur: () => FlagList.hide() }
      }))
    }
  }

  private static ensure(): HTMLElement {
    if (FlagList.card) return FlagList.card
    const card = el('div', { class: 'pointer-events-none fixed z-[70] hidden w-80 flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg' })
    document.body.append(card)
    FlagList.card = card
    return card
  }

  private static hide(): void {
    FlagList.card?.classList.add('hidden')
    FlagList.card?.classList.remove('flex')
  }

  private show(anchor: HTMLElement, argument: JvmArgument, info: FlagInfo): void {
    const card = FlagList.ensure()
    card.replaceChildren(
      el('div', { class: 'flex items-center justify-between gap-2' },
        el('strong', { class: 'text-sm', text: info.title }),
        el('span', { class: `shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_CLASSES[argument.source]}`, text: this.labels[argument.source] })),
      el('p', { class: 'text-xs text-muted-foreground', text: CATEGORY_LABELS[info.category][this.language] }),
      el('p', { class: 'leading-relaxed', text: info.body }),
      ...(info.detail ? [el('p', { class: 'break-all rounded bg-control px-2 py-1 font-mono text-xs', text: info.detail })] : [])
    )
    card.classList.remove('hidden')
    card.classList.add('flex')
    const rect = anchor.getBoundingClientRect()
    const height = card.offsetHeight
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - card.offsetWidth - 8))
    const top = rect.bottom + 8 + height > window.innerHeight ? Math.max(8, rect.top - height - 8) : rect.bottom + 8
    card.style.left = `${left}px`
    card.style.top = `${top}px`
  }
}