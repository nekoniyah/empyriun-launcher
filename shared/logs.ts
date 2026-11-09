export type LogGroup = 'launcher' | 'game' | 'crash' | 'archive'

export interface LogFile {
  readonly id: string
  readonly label: string
  readonly group: LogGroup
  readonly size: number
  readonly modified: number
}

export interface LogChunk {
  readonly text: string
  readonly next: number
  readonly size: number
  readonly reset: boolean
}

export interface LogMatch {
  readonly id: string
  readonly label: string
  readonly group: LogGroup
  readonly count: number
  readonly samples: readonly string[]
}