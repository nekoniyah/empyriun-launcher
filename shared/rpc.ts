import type { RPCSchema } from 'electrobun'
import type { AppResult, GameState, InstallProgress, SettingsPatch, SettingsView } from './game'
import type { AccountSummary, AuthResult, DeviceCodePrompt } from './auth'
import type { LogChunk, LogFile, LogGroup, LogMatch } from './logs'
import type { MetadataSummary, PackSummary } from './content'
import type { ContentImage } from './content-image'
import type { IntegrityReport } from './integrity'
import type { UpdateState } from './update'
import type { SkinImage } from './skin'

export type MainRPC = {
  bun: RPCSchema<{
    requests: {
      ping: { params: Record<string, never>, response: string }
      listAccounts: { params: Record<string, never>, response: readonly AccountSummary[] }
      beginLogin: { params: Record<string, never>, response: AuthResult<DeviceCodePrompt> }
      cancelLogin: { params: Record<string, never>, response: boolean }
      switchAccount: { params: { accountId: string }, response: AuthResult<readonly AccountSummary[]> }
      removeAccount: { params: { accountId: string }, response: AuthResult<readonly AccountSummary[]> }
      verifyActiveAccount: { params: Record<string, never>, response: AuthResult<AccountSummary> }
      getMetadata: { params: Record<string, never>, response: AppResult<MetadataSummary> }
      prepareGame: { params: { repair: boolean }, response: AppResult<PackSummary> }
      play: { params: { repair: boolean }, response: AppResult<GameState> }
      stopGame: { params: Record<string, never>, response: boolean }
      getGameState: { params: Record<string, never>, response: GameState }
      getSettings: { params: Record<string, never>, response: SettingsView }
      saveSettings: { params: { patch: SettingsPatch }, response: AppResult<SettingsView> }
      openLink: { params: { url: string }, response: boolean }
      listLogs: { params: Record<string, never>, response: readonly LogFile[] }
      readLog: { params: { id: string, offset: number }, response: AppResult<LogChunk> }
      auditInstance: { params: Record<string, never>, response: AppResult<IntegrityReport | null> }
      deleteLog: { params: { id: string }, response: AppResult<boolean> }
      clearLogs: { params: { group: LogGroup }, response: AppResult<number> }
      searchLogs: { params: { query: string }, response: AppResult<readonly LogMatch[]> }
      getSkin: { params: { accountId: string }, response: AppResult<SkinImage> }
      getContentImage: { params: { url: string }, response: AppResult<ContentImage> }
      getUpdateState: { params: Record<string, never>, response: UpdateState }
    }
    messages: {
      log: { message: string }
      appReady: Record<string, never>
      closeWindow: Record<string, never>
      minimizeWindow: Record<string, never>
      maximizeWindow: Record<string, never>
      dragBegin: { x: number, y: number }
      dragMove: { x: number, y: number }
      dragEnd: Record<string, never>
    }
  }>
  webview: RPCSchema<{
    requests: Record<string, never>
    messages: {
      windowStateChanged: { isMaximized: boolean }
      trayAction: { action: string }
      loginFinished: { result: AuthResult<readonly AccountSummary[]> }
      installProgress: { progress: InstallProgress }
      gameStateChanged: { state: GameState }
      updateStateChanged: { state: UpdateState }
    }
  }>
}