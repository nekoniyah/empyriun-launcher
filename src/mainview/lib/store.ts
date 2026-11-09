export type Listener<T> = (value: T) => void
export type Unsubscribe = () => void

export class Store<T> {
  private readonly listeners = new Set<Listener<T>>()

  constructor(private value: T) {}

  get(): T {
    return this.value
  }

  set(next: T): void {
    this.value = next
    this.listeners.forEach((listener) => listener(next))
  }

  update(patch: Partial<T>): void {
    this.set({ ...this.value, ...patch })
  }

  subscribe(listener: Listener<T>, immediate: boolean = true): Unsubscribe {
    this.listeners.add(listener)
    if (immediate) listener(this.value)
    return () => this.listeners.delete(listener)
  }
}

export class Channel<T> {
  private readonly listeners = new Set<Listener<T>>()

  on(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(value: T): void {
    this.listeners.forEach((listener) => listener(value))
  }
}