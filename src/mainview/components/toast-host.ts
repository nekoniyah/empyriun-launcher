import { el } from '../lib/dom'
import { icon, type IconName } from '../lib/icons'
import type { AppController, ToastKind } from '../state/app-controller'

const TONE: Readonly<Record<ToastKind, { readonly icon: IconName; readonly color: string }>> = {
  info: { icon: 'info', color: 'text-muted-foreground' },
  success: { icon: 'check', color: 'text-success' },
  error: { icon: 'alert', color: 'text-destructive' }
}

export class ToastHost {
  readonly element = el('div', { class: 'pointer-events-none fixed right-4 bottom-4 z-50 flex w-[22rem] flex-col gap-2' })

  constructor(app: AppController) {
    app.toasts.subscribe((toasts) => {
      this.element.replaceChildren(
        ...toasts.map((toast) =>
          el(
            'div',
            { class: 'pointer-events-auto flex animate-rise items-start gap-3 rounded-md border border-border bg-popover px-3.5 py-3 text-sm text-popover-foreground shadow-lg' },
            el('span', { class: `mt-0.5 ${TONE[toast.kind].color}` }, icon(TONE[toast.kind].icon, 16)),
            el('span', { class: 'selectable min-w-0 flex-1 break-words', text: toast.message })
          )
        )
      )
    })
  }
}