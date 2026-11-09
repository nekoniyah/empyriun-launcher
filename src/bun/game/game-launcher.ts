import { mkdir } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import type { GameSettings } from '../../../shared/game'
import type { VerifiedSession } from '../auth/verified-session'
import { cleanJavaEnvironment } from '../core/environment'
import { GameError } from '../core/game-error'
import type { Platform } from '../core/platform'
import type { ArgumentBuilder } from './argument-builder'
import type { PreparedGame } from './game-installer'

const WINDOWS_COMMAND_LIMIT = 30000

export interface SessionSource {
  hasActiveAccount(): boolean
  createSession(): Promise<VerifiedSession>
}

export interface RunningGame {
  readonly pid: number
}

export class GameLauncher {
  private child: ReturnType<typeof Bun.spawn> | null = null

  constructor(private readonly builder: ArgumentBuilder, private readonly platform: Platform) { }

  async launch(session: VerifiedSession, prepared: PreparedGame, settings: GameSettings, onExit: (code: number | null) => void): Promise<RunningGame> {
    if (this.child) throw new GameError('busy', 'The game is already running.')
    const { jvm, game } = this.builder.build({ session, prepared, settings })
    const command = [prepared.runtime.gui, ...jvm, prepared.profile.mainClass, ...game]
    if (this.platform.os === 'windows' && command.join(' ').length > WINDOWS_COMMAND_LIMIT) throw new GameError('launch_failed', 'The launch command is too long for Windows.')
    await this.prepareDirectories(jvm, prepared.nativesDir)
    const logs = join(prepared.instanceDir, 'logs')
    await mkdir(logs, { recursive: true })
    try {
      const child = Bun.spawn(command, {
        cwd: prepared.instanceDir,
        env: cleanJavaEnvironment(),
        stdin: 'ignore',
        stdout: Bun.file(join(logs, 'launcher-stdout.log')),
        stderr: Bun.file(join(logs, 'launcher-stderr.log')),
        windowsHide: true
      })
      this.child = child
      child.unref()
      void child.exited.then((code) => {
        this.child = null
        onExit(code)
      })
      return { pid: child.pid }
    } catch (cause) {
      throw new GameError('launch_failed', 'The game process could not be started.', { cause })
    }
  }

  stop(): boolean {
    if (!this.child) return false
    this.child.kill()
    return true
  }

  private async prepareDirectories(jvm: readonly string[], nativesDir: string): Promise<void> {
    const base = resolve(nativesDir)
    await mkdir(base, { recursive: true })
    for (const argument of jvm) {
      const value = argument.includes('=') ? argument.slice(argument.indexOf('=') + 1) : argument
      if (isAbsolute(value) && resolve(value).startsWith(base)) await mkdir(resolve(value), { recursive: true })
    }
  }
}