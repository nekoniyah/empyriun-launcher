import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import appConfig from '../../app.config'

const REDACTIONS: readonly (readonly [RegExp, string])[] = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[redacted-jwt]'],
  [/("?(?:access_token|refresh_token|id_token|device_code|xsts_token|user_code)"?\s*[:=]\s*)"?[^"\s,&}]+"?/gi, '$1"[redacted]"']
]

export class CrashLogger {
  private readonly directory = CrashLogger.resolveDirectory()
  private readonly file = join(this.directory, 'main.log')

  get path(): string {
    return this.file
  }

  install(): void {
    const originalError = console.error.bind(console)
    console.error = (...args: unknown[]): void => {
      this.write('ERROR', args)
      originalError(...args)
    }
    process.on('uncaughtException', (error) => {
      this.write('UNCAUGHT', [error.stack ?? error.message])
      console.error('Uncaught exception', error)
    })
    process.on('unhandledRejection', (reason) => {
      this.write('UNHANDLED_REJECTION', [reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)])
      console.error('Unhandled rejection', reason)
    })
  }

  private write(level: string, args: readonly unknown[]): void {
    try {
      mkdirSync(this.directory, { recursive: true })
      const message = args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(' ')
      appendFileSync(this.file, `${new Date().toISOString()} [${level}] ${CrashLogger.redact(message)}\n`)
    } catch {
      return
    }
  }

  static redact(text: string): string {
    return REDACTIONS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)
  }

  private static resolveDirectory(): string {
    const home = homedir()
    if (process.platform === 'darwin') return join(home, 'Library', 'Logs', appConfig.name)
    if (process.platform === 'win32') return join(process.env['APPDATA'] ?? join(home, 'AppData', 'Roaming'), appConfig.name, 'logs')
    return join(home, '.local', 'state', appConfig.name, 'logs')
  }
}

const logger = new CrashLogger()

export function installCrashLogger(): void {
  logger.install()
}

export function getCrashLogPath(): string {
  return logger.path
}

export function redactSecrets(text: string): string {
  return CrashLogger.redact(text)
}