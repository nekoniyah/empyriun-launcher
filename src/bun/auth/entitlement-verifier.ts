import { createPublicKey, createVerify, type KeyObject } from 'node:crypto'
import { AuthError } from './auth-error'

const MOJANG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtz7jy4jRH3psj5AbVS6W
NHjniqlr/f5JDly2M8OKGK81nPEq765tJuSILOWrC3KQRvHJIhf84+ekMGH7iGlO
4DPGDVb6hBGoMMBhCq2jkBjuJ7fVi3oOxy5EsA/IQqa69e55ugM+GJKUndLyHeNn
X6RzRzDT4tX/i68WJikwL8rR8Jq49aVJlIEFT6F+1rDQdU2qcpfT04CBYLM5gMxE
fWRl6u1PNQixz8vSOv8pA6hB2DU8Y08VvbK7X2ls+BiS3wqqj3nyVWqoxrwVKiXR
kIqIyIAedYDFSaIq5vbmnVtIonWQPeug4/0spLQoWnTUpXRZe2/+uAKN1RY9mmaB
pRFV/Osz3PDOoICGb5AZ0asLFf/qEvGJ+di6Ltt8/aaoBuVw+7fnTw2BhkhSq1S/
va6LxHZGXE9wsLj4CN8mZXHfwVD9QG0VNQTUgEGZ4ngf7+0u30p7mPt5sYy3H+Fm
sWXqFZn55pecmrgNLqtETPWMNpWc2fJu/qqnxE9o2tBGy/MqJiw3iLYxf7U+4le4
jM49AUKrO16bD1rdFwyVuNaTefObKjEMTX9gyVUF6o7oDEItp5NHxFm3CqnQRmch
HsMs+NxEnN4E9a8PDB23b4yjKOQ9VHDxBxuaZJU60GBCIOF9tslb7OAkheSJx5Xy
EYblHbogFGPRFU++NrSQRX0CAwEAAQ==
-----END PUBLIC KEY-----`

export interface EntitlementItem {
  readonly name: string
  readonly signature: string
}

export interface EntitlementsResponse {
  readonly items?: readonly EntitlementItem[]
  readonly signature?: string
}

export class EntitlementVerifier {
  private readonly key: KeyObject = createPublicKey(MOJANG_PUBLIC_KEY)

  verify(response: EntitlementsResponse): ReadonlySet<string> {
    const items = response.items ?? []
    const names = new Set<string>()
    for (const item of items) {
      const payload = this.verifyJwt(item.signature)
      if (payload['name'] !== item.name) throw new AuthError('entitlement_invalid')
      names.add(item.name)
    }
    if (items.length === 0) return names
    if (!response.signature) throw new AuthError('entitlement_invalid')
    const outer = this.verifyJwt(response.signature)
    const signed = EntitlementVerifier.readEntitlementNames(outer['entitlements'])
    for (const name of names) if (!signed.has(name)) throw new AuthError('entitlement_invalid')
    return names
  }

  private verifyJwt(jwt: string): Record<string, unknown> {
    const parts = jwt.split('.')
    const [header, payload, signature] = parts
    if (parts.length !== 3 || !header || !payload || !signature) throw new AuthError('entitlement_invalid')
    try {
      const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as { alg?: string }
      if (decodedHeader.alg !== 'RS256') throw new AuthError('entitlement_invalid')
      const valid = createVerify('RSA-SHA256').update(`${header}.${payload}`).verify(this.key, Buffer.from(signature, 'base64url'))
      if (!valid) throw new AuthError('entitlement_invalid')
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
    } catch (error) {
      throw error instanceof AuthError ? error : new AuthError('entitlement_invalid', undefined, { cause: error })
    }
  }

  private static readEntitlementNames(value: unknown): ReadonlySet<string> {
    const names = new Set<string>()
    if (!Array.isArray(value)) return names
    for (const entry of value) if (typeof entry === 'object' && entry !== null && typeof (entry as { name?: unknown }).name === 'string') names.add((entry as { name: string }).name)
    return names
  }
}