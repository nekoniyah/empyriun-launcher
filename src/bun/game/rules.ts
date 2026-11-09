import type { Platform } from '../core/platform'

export interface Rule {
  readonly action: 'allow' | 'disallow'
  readonly os?: {
    readonly name?: string
    readonly arch?: string
    readonly version?: string
    readonly versionRange?: { readonly min?: string, readonly max?: string }
  }
  readonly features?: Readonly<Record<string, boolean>>
}

export class RuleEvaluator {
  constructor(private readonly platform: Platform, private readonly features: Readonly<Record<string, boolean>> = {}) { }

  allows(rules: readonly Rule[] | undefined): boolean {
    if (!rules || rules.length === 0) return true
    let allowed = false
    for (const rule of rules) if (this.matchesOs(rule.os) && this.matchesFeatures(rule.features)) allowed = rule.action === 'allow'
    return allowed
  }

  private matchesOs(os: Rule['os']): boolean {
    if (!os) return true
    if (os.name && os.name !== this.platform.os) return false
    if (os.arch && os.arch !== this.platform.arch) return false
    if (os.version) try { if (!new RegExp(os.version).test(this.platform.osVersion)) return false } catch { return false }
    if (os.versionRange?.min && RuleEvaluator.compare(this.platform.osVersion, os.versionRange.min) < 0) return false
    if (os.versionRange?.max && RuleEvaluator.compare(this.platform.osVersion, os.versionRange.max) >= 0) return false
    return true
  }

  private matchesFeatures(required: Rule['features']): boolean {
    if (!required) return true
    return Object.entries(required).every(([name, value]) => (this.features[name] ?? false) === value)
  }

  private static compare(left: string, right: string): number {
    const a = left.split('.').map((part) => Number.parseInt(part, 10) || 0)
    const b = right.split('.').map((part) => Number.parseInt(part, 10) || 0)
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      const difference = (a[index] ?? 0) - (b[index] ?? 0)
      if (difference !== 0) return difference
    }
    return 0
  }
}