export async function mapPool<T, R>(items: readonly T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  let failed = false
  const runner = async (): Promise<void> => {
    while (!failed) {
      const index = next
      next += 1
      const item = items[index]
      if (index >= items.length || item === undefined) return
      try {
        results[index] = await worker(item, index)
      } catch (error) {
        failed = true
        throw error
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner))
  return results
}