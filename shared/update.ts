export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export interface UpdateState {
  readonly status: UpdateStatus
  readonly currentVersion: string
  readonly latestVersion: string | null
  readonly progress: number | null
  readonly message: string | null
}