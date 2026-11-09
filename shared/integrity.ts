export type FileState = 'ok' | 'missing' | 'corrupt'

export interface ModStatus {
  readonly path: string
  readonly state: FileState
}

export interface IntegrityReport {
  readonly checkedAt: number
  readonly files: readonly ModStatus[]
  readonly disabled: readonly string[]
  readonly removed: readonly string[]
}