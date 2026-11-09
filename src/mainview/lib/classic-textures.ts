let installed = false

function random(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function texture(base: readonly [number, number, number], variance: number, seed: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const context = canvas.getContext('2d')
  if (!context) return 'none'
  const next = random(seed)
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)))
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const shade = (next() - 0.5) * variance
      context.fillStyle = `rgb(${clamp(base[0] + shade)},${clamp(base[1] + shade)},${clamp(base[2] + shade)})`
      context.fillRect(x, y, 1, 1)
    }
  }
  return `url(${canvas.toDataURL('image/png')})`
}

export function installClassicTextures(): void {
  if (installed) return
  installed = true
  const style = document.documentElement.style
  style.setProperty('--tex-dirt', texture([134, 96, 67], 40, 11))
  style.setProperty('--tex-stone', texture([128, 128, 128], 34, 23))
}

export function textureCanvas(base: readonly [number, number, number], variance: number, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const next = random(seed)
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)))
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const shade = (next() - 0.5) * variance
      context.fillStyle = `rgb(${clamp(base[0] + shade)},${clamp(base[1] + shade)},${clamp(base[2] + shade)})`
      context.fillRect(x, y, 1, 1)
    }
  }
  return canvas
}

export function grassBlockCanvas(): HTMLCanvasElement {
  const canvas = textureCanvas([134, 96, 67], 36, 5)
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const next = random(9)
  for (let x = 0; x < 16; x += 1) {
    const depth = 3 + (next() > 0.55 ? 1 : 0) + (next() > 0.85 ? 1 : 0)
    for (let y = 0; y < depth; y += 1) {
      const shade = (next() - 0.5) * 30
      context.fillStyle = `rgb(${Math.round(94 + shade)},${Math.round(168 + shade)},${Math.round(58 + shade)})`
      context.fillRect(x, y, 1, 1)
    }
  }
  return canvas
}