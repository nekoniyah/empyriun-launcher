const SVG_NS = 'http://www.w3.org/2000/svg'

type Part = string | readonly ['c', number, number, number] | readonly ['r', number, number, number, number, number]

const ICONS = {
  play: ['M7 5v14l12-7z'],
  stop: ['M7 7h10v10H7z'],
  home: ['M3 11 12 3l9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  news: [['r', 3, 4, 14, 16, 2], 'M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2', 'M7 9h6', 'M7 13h6', 'M7 17h3'],
  bag: ['M6 8h12l1.5 12h-15z', 'M9 8V7a3 3 0 0 1 6 0v1'],
  terminal: [['r', 3, 4, 18, 16, 2], 'M7 9l3 3-3 3', 'M12 15h5'],
  settings: ['M4 7h9', 'M17 7h3', 'M4 17h3', 'M11 17h9', ['c', 15, 7, 2], ['c', 9, 17, 2]],
  search: [['c', 11, 11, 6], 'M20 20l-4.5-4.5'],
  user: [['c', 12, 8, 4], 'M4 20a8 8 0 0 1 16 0'],
  users: [['c', 9, 8, 3.5], 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M15.5 4.6a3.5 3.5 0 0 1 0 6.8', 'M18 14.3A6.5 6.5 0 0 1 21.5 20'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  square: ['M5 5h14v14H5z'],
  restore: ['M9 9V5h10v10h-4', 'M5 9h10v10H5z'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  chevron: ['M9 6l6 6-6 6'],
  chevronDown: ['M6 9l6 6 6-6'],
  link: ['M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5', 'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4'],
  wrench: ['M14.5 9.5 5.2 18.8a1.8 1.8 0 0 0 2.5 2.5l9.3-9.3', ['c', 17, 7, 3.5]],
  refresh: ['M20 12a8 8 0 1 1-2.5-5.8', 'M20 4v5h-5'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  copy: [['r', 8, 8, 13, 13, 2], 'M16 4H6a2 2 0 0 0-2 2v10'],
  shield: ['M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z', 'M8.5 12l2.5 2.5 4.5-5'],
  globe: [['c', 12, 12, 9], 'M3 12h18', 'M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z'],
  palette: [['c', 12, 12, 9], ['c', 8, 10, 0.9], ['c', 12, 7.5, 0.9], ['c', 16, 10, 0.9]],
  folder: ['M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  download: ['M12 4v11', 'M7.5 11 12 15.5 16.5 11', 'M5 20h14'],
  cube: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 12l8-4.5', 'M12 12v9', 'M12 12 4 7.5'],
  info: [['c', 12, 12, 9], 'M12 11v5', 'M12 8h.01'],
  alert: ['M12 4 3 20h18z', 'M12 10v4', 'M12 17h.01'],
  gamepad: ['M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4h-1.5l-2-2h-5l-2 2H6a4 4 0 0 1-4-4v-1a4 4 0 0 1 4-4z', 'M7 11v3', 'M5.5 12.5h3', ['c', 16, 11.5, 0.8], ['c', 18, 13.5, 0.8]],
  cart: ['M3 4h2.5l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2', ['c', 9.5, 19.5, 1.2], ['c', 17, 19.5, 1.2]],
  grid: [['r', 4, 4, 6, 6, 1], ['r', 14, 4, 6, 6, 1], ['r', 4, 14, 6, 6, 1], ['r', 14, 14, 6, 6, 1]],
} as const satisfies Record<string, readonly Part[]>

const FILLED: ReadonlySet<string> = new Set(['play', 'stop'])

export type IconName = keyof typeof ICONS

export function icon(name: IconName, size: number = 18, stroke: number = 2): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  const filled = FILLED.has(name)
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('fill', filled ? 'currentColor' : 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', String(stroke))
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.flexShrink = '0'
  for (const part of ICONS[name] as readonly Part[]) {
    if (typeof part === 'string') {
      const path = document.createElementNS(SVG_NS, 'path')
      path.setAttribute('d', part)
      svg.append(path)
    } else if (part[0] === 'c') {
      const circle = document.createElementNS(SVG_NS, 'circle')
      circle.setAttribute('cx', String(part[1]))
      circle.setAttribute('cy', String(part[2]))
      circle.setAttribute('r', String(part[3]))
      svg.append(circle)
    } else {
      const rect = document.createElementNS(SVG_NS, 'rect')
      rect.setAttribute('x', String(part[1]))
      rect.setAttribute('y', String(part[2]))
      rect.setAttribute('width', String(part[3]))
      rect.setAttribute('height', String(part[4]))
      rect.setAttribute('rx', String(part[5]))
      svg.append(rect)
    }
  }
  return svg
}