export class HttpError extends Error {
  constructor(message: string, readonly url: string, readonly status: number | null, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HttpError'
  }
}

export interface HttpRequest {
  readonly method?: 'GET' | 'POST'
  readonly headers?: Readonly<Record<string, string>>
  readonly json?: unknown
  readonly form?: Readonly<Record<string, string>>
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

export interface HttpResponse<T> {
  readonly status: number
  readonly ok: boolean
  readonly data: T | null
}

export class HttpClient {
  constructor(private readonly allowedHosts: ReadonlySet<string>, private readonly userAgent: string, private readonly defaultTimeoutMs: number = 15000) { }

  async send<T>(url: string, request: HttpRequest = {}): Promise<HttpResponse<T>> {
    const target = this.validate(url)
    const headers = new Headers({ 'User-Agent': this.userAgent, Accept: 'application/json', ...request.headers })
    const init: RequestInit = { method: request.method ?? 'GET', headers, redirect: 'error' }
    if (request.json !== undefined) {
      headers.set('Content-Type', 'application/json')
      init.body = JSON.stringify(request.json)
    } else if (request.form) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded')
      init.body = new URLSearchParams(request.form).toString()
    }
    const timeout = AbortSignal.timeout(request.timeoutMs ?? this.defaultTimeoutMs)
    init.signal = request.signal ? AbortSignal.any([timeout, request.signal]) : timeout
    try {
      const response = await fetch(target, init)
      const text = await response.text()
      return { status: response.status, ok: response.ok, data: HttpClient.parse<T>(text) }
    } catch (error) {
      throw new HttpError('Network request failed', target.href, null, { cause: error })
    }
  }

  private validate(url: string): URL {
    let target: URL
    try { target = new URL(url) } catch (cause) { throw new HttpError('Invalid URL', url, null, { cause }) }
    if (target.protocol !== 'https:') throw new HttpError('Only HTTPS is allowed', url, null)
    if (!this.allowedHosts.has(target.hostname)) throw new HttpError(`Host not allowed: ${target.hostname}`, url, null)
    return target
  }

  private static parse<T>(text: string): T | null {
    if (text.length === 0) return null
    try { return JSON.parse(text) as T } catch { return null }
  }
}