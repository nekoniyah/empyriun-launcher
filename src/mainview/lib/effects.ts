interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  age: number
  ttl: number
  color: string
}

const GRAVITY = 0.22
const VARIABLES = ['--primary', '--launch-from', '--chip-from', '--art-top', '--art-moon']

class EffectsLayer {
  private readonly canvas = document.createElement('canvas')
  private readonly context = this.canvas.getContext('2d')
  private particles: Particle[] = []
  private running = false
  private rainUntil = 0
  private last = 0
  private scale = 1
  private readonly calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  constructor() {
    this.canvas.className = 'pointer-events-none fixed inset-0 z-[90]'
    this.canvas.setAttribute('aria-hidden', 'true')
    document.body.append(this.canvas)
    window.addEventListener('resize', () => this.resize())
    this.resize()
  }

  burst(x: number, y: number, count: number = 26, power: number = 6): void {
    if (this.calm) return
    const colors = this.palette()
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = (0.4 + Math.random()) * power
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, size: 4 + Math.random() * 6, age: 0, ttl: 700 + Math.random() * 500, color: colors[Math.floor(Math.random() * colors.length)] ?? '#ffffff' })
    }
    this.start()
  }

  rain(duration: number): void {
    if (this.calm) return
    this.rainUntil = performance.now() + duration
    this.start()
  }

  private palette(): string[] {
    const style = getComputedStyle(document.documentElement)
    return VARIABLES.map((name) => style.getPropertyValue(name).trim()).filter((value) => value.length > 0)
  }

  private resize(): void {
    this.scale = window.devicePixelRatio || 1
    this.canvas.width = Math.floor(window.innerWidth * this.scale)
    this.canvas.height = Math.floor(window.innerHeight * this.scale)
  }

  private start(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    requestAnimationFrame((time) => this.tick(time))
  }

  private tick(time: number): void {
    const context = this.context
    if (!context) return
    const delta = Math.min(40, time - this.last) / 16
    this.last = time
    context.setTransform(this.scale, 0, 0, this.scale, 0, 0)
    context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    if (time < this.rainUntil) {
      const colors = this.palette()
      for (let index = 0; index < 3; index += 1) this.particles.push({ x: Math.random() * window.innerWidth, y: -12, vx: (Math.random() - 0.5) * 1.2, vy: 1.5 + Math.random() * 3, size: 6 + Math.random() * 8, age: 0, ttl: 4200, color: colors[Math.floor(Math.random() * colors.length)] ?? '#ffffff' })
    }
    for (const particle of this.particles) {
      particle.age += delta * 16
      particle.vy += GRAVITY * delta
      particle.x += particle.vx * delta
      particle.y += particle.vy * delta
      context.globalAlpha = Math.max(0, 1 - particle.age / particle.ttl)
      context.fillStyle = particle.color
      context.fillRect(particle.x, particle.y, particle.size, particle.size)
    }
    context.globalAlpha = 1
    this.particles = this.particles.filter((particle) => particle.age < particle.ttl && particle.y < window.innerHeight + 40)
    if (this.particles.length === 0 && time >= this.rainUntil) {
      this.running = false
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
      return
    }
    requestAnimationFrame((next) => this.tick(next))
  }
}

export const effects = new EffectsLayer()