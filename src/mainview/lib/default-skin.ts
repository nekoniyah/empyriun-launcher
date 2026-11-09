import type { SkinSource } from '../skin/skin-viewer'

export const DEFAULT_SKIN_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABk0lEQVR4Xu1bQQqDQAysf/Ezgmf/4Uv8h2fBz/iXlgoWu4VOdycaQ6eXUtZZk8lkgoutbuBT1/UdXfNtfVmWisEfjYXBiQApQC0gD2CMSCaoKXDxMciOOaY9nljvFqlEADnnpQCSAbWA85SQB8gE/90EUw9DikCmhfDIM9n9ET69/8d5AEoA3QDhRQBggCUY4aWAhAH3MYhagl1HijiMgHme32JvmobNpQjvQkCa/Ba5BwkuBAzDsObc9/36nf4uKmUhyIWAfaxb8ntCCnMpgrkS0HXdK+hxHIsSYEGXIMAr+V9OnA6bAmzlrPCuCmjbds1jmiarfLL3EQHgwEUtwD69ZWvyZABsgZPjudzt4PsBl4vYOCARYExouO2kgHAlMw5YCjAmNNx2UkC4khkHLAUYExpuOykgXMmMA5YCjAkNt525AtABCzqgYPG5FRABuYyh69kKsngUX7ouBeQyll6PKsbuj/DIUxCeVoAICP6anRSAegStqwXUAtzf6pDC0LqmAPm6vUwQSQytywRlgrFN8AFBOQtQH9e0TAAAAABJRU5ErkJggg=='
export const DEFAULT_SKIN_SLIM = false

function placeholder(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return ''
  const fill = (color: string, x: number, y: number, w: number, h: number): void => {
    context.fillStyle = color
    context.fillRect(x, y, w, h)
  }
  fill('#c58c6e', 0, 8, 32, 8)
  fill('#c58c6e', 8, 0, 16, 8)
  fill('#4a3322', 8, 0, 8, 8)
  fill('#4a3322', 8, 8, 8, 2)
  fill('#ffffff', 9, 11, 2, 1)
  fill('#ffffff', 13, 11, 2, 1)
  fill('#3b3b8a', 10, 11, 1, 1)
  fill('#3b3b8a', 13, 11, 1, 1)
  fill('#8b4a3a', 10, 14, 4, 1)
  fill('#00a8a8', 16, 16, 24, 16)
  for (const [x, y] of [[40, 16], [32, 48]] as const) {
    fill('#c58c6e', x, y, 16, 16)
    fill('#00a8a8', x, y + 4, 16, 4)
    fill('#00a8a8', x + 4, y, 8, 4)
  }
  for (const [x, y] of [[0, 16], [16, 48]] as const) {
    fill('#3a3a9a', x, y, 16, 16)
    fill('#6b6b6b', x, y + 14, 16, 2)
  }
  return canvas.toDataURL('image/png')
}

export function defaultSource(): SkinSource {
  return { skin: DEFAULT_SKIN_DATA_URI || placeholder(), cape: null, slim: DEFAULT_SKIN_SLIM }
}