function quote(value: string): string {
  return JSON.stringify(value)
}

function number(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Non-finite numbers are not allowed in signed metadata')
  if (Object.is(value, -0)) return '0'
  return String(value)
}

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return number(value)
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map((key) => `${quote(key)}:${canonicalJson(record[key])}`).join(',')}}`
  }
  throw new Error(`Unsupported signed metadata value: ${typeof value}`)
}