import type { Vec } from './math'

export interface Geometry {
  readonly vertices: Float32Array
  readonly indices: Uint16Array
}

type Corner = readonly [number, number, number, number, number]

interface Face {
  readonly normal: Vec
  readonly corners: readonly Corner[]
}

export function boxGeometry(center: Vec, size: Vec, origin: readonly [number, number], inflate: number, textureHeight: number = 64): Geometry {
  const [cx, cy, cz] = center
  const [w, h, d] = size
  const [u, v] = origin
  const hx = w / 2 + inflate
  const hy = h / 2 + inflate
  const hz = d / 2 + inflate
  const x0 = cx - hx
  const x1 = cx + hx
  const y0 = cy - hy
  const y1 = cy + hy
  const z0 = cz - hz
  const z1 = cz + hz
  const v1 = v + d
  const v2 = v + d + h
  const faces: readonly Face[] = [
    { normal: [0, 0, 1], corners: [[x0, y0, z1, u + d, v2], [x1, y0, z1, u + d + w, v2], [x1, y1, z1, u + d + w, v1], [x0, y1, z1, u + d, v1]] },
    { normal: [0, 0, -1], corners: [[x1, y0, z0, u + 2 * d + w, v2], [x0, y0, z0, u + 2 * d + 2 * w, v2], [x0, y1, z0, u + 2 * d + 2 * w, v1], [x1, y1, z0, u + 2 * d + w, v1]] },
    { normal: [-1, 0, 0], corners: [[x0, y0, z0, u, v2], [x0, y0, z1, u + d, v2], [x0, y1, z1, u + d, v1], [x0, y1, z0, u, v1]] },
    { normal: [1, 0, 0], corners: [[x1, y0, z1, u + d + w, v2], [x1, y0, z0, u + 2 * d + w, v2], [x1, y1, z0, u + 2 * d + w, v1], [x1, y1, z1, u + d + w, v1]] },
    { normal: [0, 1, 0], corners: [[x0, y1, z1, u + d, v + d], [x1, y1, z1, u + d + w, v + d], [x1, y1, z0, u + d + w, v], [x0, y1, z0, u + d, v]] },
    { normal: [0, -1, 0], corners: [[x0, y0, z0, u + d + w, v + d], [x1, y0, z0, u + d + 2 * w, v + d], [x1, y0, z1, u + d + 2 * w, v], [x0, y0, z1, u + d + w, v]] }
  ]
  const vertices: number[] = []
  const indices: number[] = []
  faces.forEach((face, faceIndex) => {
    for (const [x, y, z, pu, pv] of face.corners) vertices.push(x, y, z, face.normal[0], face.normal[1], face.normal[2], pu / 64, pv / textureHeight)
    const base = faceIndex * 4
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  })
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) }
}