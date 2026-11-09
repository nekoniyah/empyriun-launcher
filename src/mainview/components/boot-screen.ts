const MIN_MS = 1600
const REMOVE_MS = 700

export class BootScreen {
  private readonly root = document.getElementById('boot')
  private readonly status = document.getElementById('boot-status')

  setStatus(text: string): void {
    if (this.status) this.status.textContent = text
  }

  async finish(): Promise<void> {
    const wait = MIN_MS - performance.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    document.body.classList.add('ready')
    this.root?.classList.add('out')
    setTimeout(() => this.root?.remove(), REMOVE_MS)
  }
}