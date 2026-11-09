const HEAD = ['GGGGGGGG', 'GgGGGGgG', 'GKKGGKKG', 'GKKGGKKG', 'GGGKKGGG', 'GGKKKKGG', 'GGKKKKGG', 'GGKGGKGG']
const BODY = ['..gGGg..', '..GGGG..', '..GGGG..', '..gGGg..', '..GGGG..', '..GGGG..']
const LEGS: readonly (readonly string[])[] = [
  ['.GG..GG.', '.GG..GG.', '.GG..GG.', '.gg..gg.'],
  ['GG....GG', 'GG....GG', 'GG....GG', 'gg....gg']
]

export const CREEPER_PALETTE: Readonly<Record<string, string>> = { G: '#4bb03a', g: '#3a8f2e', K: '#0c1a0a' }

export function creeperRows(frame: 0 | 1): string[] {
  return [...HEAD, ...BODY, ...(LEGS[frame] ?? [])]
}

export function drawSprite(canvas: HTMLCanvasElement, rows: readonly string[], palette: Readonly<Record<string, string>>, scale: number): void {
  canvas.width = (rows[0]?.length ?? 0) * scale
  canvas.height = rows.length * scale
  const context = canvas.getContext('2d')
  if (!context) return
  rows.forEach((row, y) => {
    Array.from(row).forEach((cell, x) => {
      const color = palette[cell]
      if (!color) return
      context.fillStyle = color
      context.fillRect(x * scale, y * scale, scale, scale)
    })
  })
}