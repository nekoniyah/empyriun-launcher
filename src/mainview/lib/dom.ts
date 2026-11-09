export type Child = Node | string | null | undefined | false

type Handlers = { [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void }

export interface ElementOptions {
  readonly class?: string
  readonly text?: string
  readonly attrs?: Readonly<Record<string, string>>
  readonly on?: Handlers
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, options: ElementOptions = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (options.class) element.className = options.class
  if (options.text !== undefined) element.textContent = options.text
  for (const [name, value] of Object.entries(options.attrs ?? {})) element.setAttribute(name, value)
  for (const [type, handler] of Object.entries(options.on ?? {})) element.addEventListener(type, handler as EventListener)
  for (const child of children) if (child) element.append(child)
  return element
}