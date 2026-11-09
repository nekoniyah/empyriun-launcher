import { isAbsolute, resolve, sep } from 'node:path'
import { GameError } from './game-error'

export function validateRelativePath(relative: string): readonly string[] {
  const unsafe = relative.length === 0 || relative.length > 240 || relative.includes('\0') || relative.includes('\\') || isAbsolute(relative) || /^[A-Za-z]:/.test(relative)
  const segments = relative.split('/')
  if (unsafe || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) throw new GameError('unsafe_path', `Unsafe path rejected: ${relative.slice(0, 80)}`)
  return segments
}

export function resolveInside(root: string, relative: string): string {
  const base = resolve(root)
  const target = resolve(base, ...validateRelativePath(relative))
  if (!target.startsWith(`${base}${sep}`)) throw new GameError('unsafe_path', `Path escapes its folder: ${relative.slice(0, 80)}`)
  return target
}