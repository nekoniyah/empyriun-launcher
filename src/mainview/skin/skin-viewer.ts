import { boxGeometry, type Geometry } from './geometry'
import { loadImage } from './image'
import { lookAt, multiply, perspective, rotationX, rotationY, translation, type Mat, type Vec } from './math'

export interface SkinSource {
  readonly skin: string
  readonly cape: string | null
  readonly slim: boolean
}

export interface ViewerOptions {
  readonly onPoke?: (x: number, y: number) => void
}

type Swing = (time: number, waving: boolean) => readonly [number, number]

interface Mesh {
  readonly vao: WebGLVertexArrayObject
  readonly count: number
}

interface Part {
  readonly pivot: Vec
  readonly base: Mesh
  readonly overlay: Mesh
  readonly swing: Swing
}

const VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
out vec2 vUv;
out float vLight;
void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  vUv = aUv;
  vec3 normal = normalize(mat3(uModel) * aNormal);
  vLight = 0.6 + 0.4 * max(dot(normal, normalize(vec3(0.4, 0.8, 0.6))), 0.0);
}`

const FRAGMENT = `#version 300 es
precision mediump float;
uniform sampler2D uTexture;
uniform float uOpaque;
in vec2 vUv;
in float vLight;
out vec4 outColor;
void main() {
  vec4 color = texture(uTexture, vUv);
  if (uOpaque < 0.5 && color.a < 0.5) discard;
  outColor = vec4(color.rgb * vLight, 1.0);
}`

const LEGACY_MIRRORS: readonly (readonly [number, number, number, number, number, number])[] = [
  [4, 16, 4, 4, 20, 48], [8, 16, 4, 4, 24, 48], [0, 20, 4, 12, 24, 52], [4, 20, 4, 12, 20, 52], [8, 20, 4, 12, 16, 52], [12, 20, 4, 12, 28, 52],
  [44, 16, 4, 4, 36, 48], [48, 16, 4, 4, 40, 48], [40, 20, 4, 12, 44, 52], [44, 20, 4, 12, 36, 52], [48, 20, 4, 12, 32, 52], [52, 20, 4, 12, 48, 52]
]

const STILL: Swing = () => [0, 0]
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

function prepareSkin(image: HTMLImageElement): HTMLCanvasElement {
  const scale = image.width / 64
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.width
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.imageSmoothingEnabled = false
  context.drawImage(image, 0, 0)
  if (image.height * 2 !== image.width) return canvas
  for (const [sx, sy, w, h, dx, dy] of LEGACY_MIRRORS) {
    context.save()
    context.translate((dx + w) * scale, dy * scale)
    context.scale(-1, 1)
    context.drawImage(canvas, sx * scale, sy * scale, w * scale, h * scale, 0, 0, w * scale, h * scale)
    context.restore()
  }
  return canvas
}

export class SkinViewer {
  readonly element = document.createElement('canvas')
  private readonly gl = this.element.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false })
  private program: WebGLProgram | null = null
  private parts: Part[] = []
  private cape: Mesh | null = null
  private skinTexture: WebGLTexture | null = null
  private capeTexture: WebGLTexture | null = null
  private yaw = 0.5
  private pitch = 0.12
  private distance = 82
  private dragging = false
  private moved = 0
  private lastX = 0
  private lastY = 0
  private lastInteraction = 0
  private lastFrame = 0
  private pokedAt = -10000
  private frameId = 0
  private disposed = false

  constructor(private readonly options: ViewerOptions = {}) {
    if (!this.gl) return
    this.program = this.link(this.gl)
    this.element.addEventListener('pointerdown', (event) => this.onDown(event))
    this.element.addEventListener('pointermove', (event) => this.onMove(event))
    this.element.addEventListener('pointerup', (event) => this.onUp(event))
    this.element.addEventListener('wheel', (event) => {
      event.preventDefault()
      this.distance = clamp(this.distance + event.deltaY * 0.05, 52, 130)
    }, { passive: false })
    this.frameId = requestAnimationFrame(this.frame)
  }

  get supported(): boolean {
    return this.gl !== null && this.program !== null
  }

  async load(source: SkinSource): Promise<void> {
    const gl = this.gl
    if (!gl || !this.program) return
    const [skinImage, capeImage] = await Promise.all([loadImage(source.skin), source.cape ? loadImage(source.cape).catch(() => null) : Promise.resolve(null)])
    this.skinTexture = this.texture(gl, prepareSkin(skinImage))
    this.capeTexture = capeImage ? this.texture(gl, capeImage) : null
    this.cape = capeImage ? this.upload(gl, boxGeometry([0, -8, 0.5], [10, 16, 1], [0, 0], 0, 32)) : null
    this.parts = this.buildParts(gl, source.slim)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext()
  }

  private buildParts(gl: WebGL2RenderingContext, slim: boolean): Part[] {
    const arm = slim ? 3 : 4
    const offset = 4 + arm / 2
    const make = (center: Vec, size: Vec, uv: readonly [number, number], overlayUv: readonly [number, number], inflate: number, pivot: Vec, swing: Swing): Part => ({
      pivot,
      base: this.upload(gl, boxGeometry(center, size, uv, 0)),
      overlay: this.upload(gl, boxGeometry(center, size, overlayUv, inflate)),
      swing
    })
    return [
      make([0, 28, 0], [8, 8, 8], [0, 0], [32, 0], 0.5, [0, 24, 0], (t) => [Math.sin(t * 0.9) * 0.05, Math.sin(t * 0.6) * 0.14]),
      make([0, 18, 0], [8, 12, 4], [16, 16], [16, 32], 0.25, [0, 18, 0], STILL),
      make([-offset, 18, 0], [arm, 12, 4], [40, 16], [40, 32], 0.25, [-offset, 24, 0], (t, waving) => (waving ? [-2.5 + Math.sin(t * 14) * 0.3, 0] : [Math.sin(t * 1.2) * 0.07, 0])),
      make([offset, 18, 0], [arm, 12, 4], [32, 48], [48, 48], 0.25, [offset, 24, 0], (t) => [-Math.sin(t * 1.2) * 0.07, 0]),
      make([-2, 6, 0], [4, 12, 4], [0, 16], [0, 32], 0.25, [-2, 12, 0], (t) => [-Math.sin(t * 1.2) * 0.04, 0]),
      make([2, 6, 0], [4, 12, 4], [16, 48], [0, 48], 0.25, [2, 12, 0], (t) => [Math.sin(t * 1.2) * 0.04, 0])
    ]
  }

  private link(gl: WebGL2RenderingContext): WebGLProgram | null {
    const compile = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
    }
    const vertex = compile(gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) return null
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
  }

  private upload(gl: WebGL2RenderingContext, geometry: Geometry): Mesh {
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24)
    gl.bindVertexArray(null)
    return { vao, count: geometry.indices.length }
  }

  private texture(gl: WebGL2RenderingContext, source: TexImageSource): WebGLTexture {
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return texture
  }

  private onDown(event: PointerEvent): void {
    this.dragging = true
    this.moved = 0
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.element.setPointerCapture(event.pointerId)
  }

  private onMove(event: PointerEvent): void {
    if (!this.dragging) return
    const dx = event.clientX - this.lastX
    const dy = event.clientY - this.lastY
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.moved += Math.abs(dx) + Math.abs(dy)
    this.yaw += dx * 0.012
    this.pitch = clamp(this.pitch + dy * 0.008, -0.45, 0.6)
    this.lastInteraction = performance.now()
  }

  private onUp(event: PointerEvent): void {
    this.dragging = false
    if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId)
    if (this.moved >= 4) return
    this.pokedAt = performance.now()
    this.options.onPoke?.(event.clientX, event.clientY)
  }

  private readonly frame = (time: number): void => {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(this.frame)
    const gl = this.gl
    const program = this.program
    if (!gl || !program || this.parts.length === 0 || !this.skinTexture || !this.element.isConnected) return
    const delta = Math.min(0.05, (time - this.lastFrame) / 1000)
    this.lastFrame = time
    if (!this.dragging && time - this.lastInteraction > 2000) this.yaw += delta * 0.5
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.floor(this.element.clientWidth * dpr))
    const height = Math.max(1, Math.floor(this.element.clientHeight * dpr))
    if (this.element.width !== width || this.element.height !== height) {
      this.element.width = width
      this.element.height = height
    }
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.useProgram(program)
    const seconds = time / 1000
    const age = time - this.pokedAt
    const waving = age < 1600
    const hop = age < 500 ? Math.sin((age / 500) * Math.PI) * 4 : 0
    const target: Vec = [0, 16, 0]
    const eye: Vec = [0, 16 + Math.sin(this.pitch) * this.distance, Math.cos(this.pitch) * this.distance]
    this.matrix(gl, program, 'uProjection', perspective(0.5, width / height, 10, 400))
    this.matrix(gl, program, 'uView', lookAt(eye, target, [0, 1, 0]))
    const root = multiply(translation(0, hop, 0), rotationY(this.yaw))
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0)
    gl.bindTexture(gl.TEXTURE_2D, this.skinTexture)
    for (const part of this.parts) {
      const [ax, ay] = part.swing(seconds, waving)
      const [px, py, pz] = part.pivot
      const model = multiply(root, multiply(translation(px, py, pz), multiply(rotationY(ay), multiply(rotationX(ax), translation(-px, -py, -pz)))))
      this.matrix(gl, program, 'uModel', model)
      this.draw(gl, program, part.base, 1)
      this.draw(gl, program, part.overlay, 0)
    }
    if (this.cape && this.capeTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.capeTexture)
      this.matrix(gl, program, 'uModel', multiply(root, multiply(translation(0, 24, -2), multiply(rotationX(0.1 + Math.sin(seconds * 1.5) * 0.03), rotationY(Math.PI)))))
      this.draw(gl, program, this.cape, 0)
    }
  }

  private matrix(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, value: Mat): void {
    gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, value)
  }

  private draw(gl: WebGL2RenderingContext, program: WebGLProgram, mesh: Mesh, opaque: number): void {
    gl.uniform1f(gl.getUniformLocation(program, 'uOpaque'), opaque)
    gl.bindVertexArray(mesh.vao)
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0)
  }
}