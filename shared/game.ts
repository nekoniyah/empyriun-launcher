import type { Preferences, ThemeId } from './preferences'
import type { JvmArgument } from './jvm-flags'
import type { AuthErrorCode } from './auth'

export type GameErrorCode =
  | 'busy'
  | 'metadata_unavailable'
  | 'metadata_invalid'
  | 'unsupported_version'
  | 'unsupported_platform'
  | 'download_failed'
  | 'integrity_failed'
  | 'java_unavailable'
  | 'loader_failed'
  | 'unsafe_path'
  | 'launch_failed'
  | 'invalid_settings'

export interface AppFailure {
  readonly code: AuthErrorCode | GameErrorCode
  readonly message: string
}

export type AppResult<T> =
  | { readonly ok: true, readonly value: T }
  | { readonly ok: false, readonly error: AppFailure }

export type InstallStage = 'metadata' | 'minecraft' | 'java' | 'loader' | 'libraries' | 'assets' | 'pack' | 'ready'

export interface InstallProgress {
  readonly stage: InstallStage
  readonly label: string
  readonly stageFraction: number
  readonly overall: number
}

export type GamePhase = 'idle' | 'installing' | 'launching' | 'running'

export interface GameState {
  readonly phase: GamePhase
  readonly pid: number | null
  readonly exitCode: number | null
}

export interface GameSettings {
  readonly memoryMb: number
}

export interface SettingsView extends GameSettings, Preferences {
  readonly minMb: number
  readonly maxMb: number
  readonly stepMb: number
  readonly totalMb: number
  readonly unlocked: readonly ThemeId[]
  readonly jvm: readonly JvmArgument[]
}

export interface SettingsPatch {
  readonly memoryMb?: number
  readonly language?: string
  readonly theme?: string
  readonly unlock?: string
}