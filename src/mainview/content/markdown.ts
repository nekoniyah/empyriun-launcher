import type { AppController } from '../state/app-controller'

function appendText(parent: Node, value: string): void {
  parent.appendChild(document.createTextNode(value))
}

function appendLink(parent: Node, label: string, url: string, app: AppController): void {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'content-link'
  element.textContent = label
  element.addEventListener('click', () => { void app.openLink(url) })
  parent.appendChild(element)
}

function appendInline(parent: Node, source: string, app: AppController): void {
  const pattern = /(\[[^\]]+\]\(https:\/\/[^)\s]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let cursor = 0
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0
    const token = match[0] ?? ''
    if (index > cursor) appendText(parent, source.slice(cursor, index))
    if (token.startsWith('[')) {
      const parsed = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(token)
      if (parsed) appendLink(parent, parsed[1] ?? '', parsed[2] ?? '', app)
      else appendText(parent, token)
    } else if (token.startsWith('`')) {
      const code = document.createElement('code')
      code.textContent = token.slice(1, -1)
      parent.appendChild(code)
    } else if (token.startsWith('**')) {
      const strong = document.createElement('strong')
      strong.textContent = token.slice(2, -2)
      parent.appendChild(strong)
    } else if (token.startsWith('*')) {
      const emphasis = document.createElement('em')
      emphasis.textContent = token.slice(1, -1)
      parent.appendChild(emphasis)
    } else {
      appendText(parent, token)
    }
    cursor = index + token.length
  }
  if (cursor < source.length) appendText(parent, source.slice(cursor))
}

function createHeading(level: number, value: string, app: AppController): HTMLElement {
  const tag = `h${Math.min(3, Math.max(1, level))}`
  const element = document.createElement(tag)
  appendInline(element, value, app)
  return element
}

export function markdown(source: string, app: AppController): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  let codeBlock: HTMLPreElement | null = null
  let codeLines: string[] = []
  let list: HTMLUListElement | HTMLOListElement | null = null
  let listKind: 'ul' | 'ol' | null = null
  const closeCode = (): void => {
    if (!codeBlock) return
    const code = document.createElement('code')
    code.textContent = codeLines.join('\n')
    codeBlock.append(code)
    fragment.append(codeBlock)
    codeBlock = null
    codeLines = []
  }
  const closeList = (): void => {
    if (!list) return
    fragment.append(list)
    list = null
    listKind = null
  }
  for (const line of lines) {
    if (line.startsWith('```')) {
      closeList()
      if (codeBlock) closeCode()
      else codeBlock = document.createElement('pre')
      continue
    }
    if (codeBlock) {
      codeLines.push(line)
      continue
    }
    if (line.trim().length === 0) {
      closeList()
      continue
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      closeList()
      fragment.append(createHeading(heading[1]?.length ?? 1, heading[2] ?? '', app))
      continue
    }
    const quote = /^>\s?(.+)$/.exec(line)
    if (quote) {
      closeList()
      const element = document.createElement('blockquote')
      appendInline(element, quote[1] ?? '', app)
      fragment.append(element)
      continue
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line)
    const ordered = /^\d+\.\s+(.+)$/.exec(line)
    if (unordered || ordered) {
      const kind: 'ul' | 'ol' = unordered ? 'ul' : 'ol'
      if (!list || listKind !== kind) {
        closeList()
        list = document.createElement(kind)
        listKind = kind
      }
      const item = document.createElement('li')
      appendInline(item, unordered?.[1] ?? ordered?.[1] ?? '', app)
      list.append(item)
      continue
    }
    closeList()
    const paragraph = document.createElement('p')
    appendInline(paragraph, line, app)
    fragment.append(paragraph)
  }
  closeCode()
  closeList()
  return fragment
}