import type { InstallProgress, InstallStage } from '../../../shared/game'

const ORDER: readonly InstallStage[] = ['metadata', 'minecraft', 'java', 'loader', 'libraries', 'assets', 'pack']
const WEIGHTS: Readonly<Record<string, number>> = { metadata: 2, minecraft: 8, java: 25, loader: 10, libraries: 15, assets: 25, pack: 15 }
const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0)
const EMIT_INTERVAL_MS = 100

export class ProgressReporter {
  private stage: InstallStage = 'metadata'
  private label = ''
  private total = 1
  private done = 0
  private lastEmit = 0

  constructor(private readonly emit: (progress: InstallProgress) => void) {}

  begin(stage: InstallStage, label: string, total: number): void {
    this.stage = stage
    this.label = label
    this.total = Math.max(1, total)
    this.done = 0
    this.push(true)
  }

  advance(count: number = 1): void {
    this.done = Math.min(this.total, this.done + count)
    this.push(this.done >= this.total)
  }

  finish(): void {
    this.stage = 'ready'
    this.label = 'Ready'
    this.total = 1
    this.done = 1
    this.push(true)
  }

  private push(force: boolean): void {
    const now = Date.now()
    if (!force && now - this.lastEmit < EMIT_INTERVAL_MS) return
    this.lastEmit = now
    const fraction = this.done / this.total
    const index = ORDER.indexOf(this.stage)
    const before = ORDER.slice(0, Math.max(0, index)).reduce((sum, name) => sum + (WEIGHTS[name] ?? 0), 0)
    const overall = this.stage === 'ready' ? 1 : (before + (WEIGHTS[this.stage] ?? 0) * fraction) / TOTAL_WEIGHT
    this.emit({ stage: this.stage, label: this.label, stageFraction: fraction, overall })
  }
}