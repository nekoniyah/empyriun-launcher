export type HashAlgorithm = 'sha1' | 'sha256' | 'sha512'

const CHUNK_SIZE = 8 * 1024 * 1024

export async function hashFile(path: string, algorithm: HashAlgorithm): Promise<string> {
  const file = Bun.file(path)
  const hasher = new Bun.CryptoHasher(algorithm)
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    hasher.update(await file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size)).arrayBuffer())
  }
  return hasher.digest('hex')
}