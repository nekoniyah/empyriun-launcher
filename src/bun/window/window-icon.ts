import { dlopen, FFIType, JSCallback, ptr, type Pointer } from 'bun:ffi'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ICON_ICO_BASE64 } from '../generated/brand'

const WM_SETICON = 0x0080
const IMAGE_ICON = 1
const LR_LOADFROMFILE = 0x10
const TARGETS: readonly (readonly [kind: number, size: number])[] = [
  [0, 16],
  [1, 32]
]

export class WindowIcon {
  constructor(private readonly directory: string, private readonly title: string) { }

  apply(): number {
    if (process.platform !== 'win32') return 0
    try {
      mkdirSync(this.directory, { recursive: true })
      const file = join(this.directory, 'window.ico')
      writeFileSync(file, Buffer.from(ICON_ICO_BASE64, 'base64'))
      const user32 = dlopen('user32.dll', {
        FindWindowW: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
        EnumWindows: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i32 },
        GetWindowThreadProcessId: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.u32 },
        LoadImageW: { args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.i32, FFIType.i32, FFIType.u32], returns: FFIType.ptr },
        SendMessageW: { args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr], returns: FFIType.ptr }
      })
      const found: (Pointer | bigint)[] = []
      const titleBuffer = Buffer.from(`${this.title}\0`, 'utf16le')
      const byTitle = user32.symbols.FindWindowW(null, ptr(titleBuffer))
      if (byTitle) found.push(byTitle)
      const processId = new Uint32Array(1)
      const callback = new JSCallback(
        (handle: Pointer) => {
          user32.symbols.GetWindowThreadProcessId(handle, ptr(processId))
          if (processId[0] === process.pid) found.push(handle)
          return 1
        },
        { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.i32 }
      )
      try {
        user32.symbols.EnumWindows(callback.ptr, null)
      } finally {
        callback.close()
      }
      const fileBuffer = Buffer.from(`${file}\0`, 'utf16le')
      let applied = 0
      for (const window of new Set(found)) {
        for (const [kind, size] of TARGETS) {
          const icon = user32.symbols.LoadImageW(null, ptr(fileBuffer), IMAGE_ICON, size, size, LR_LOADFROMFILE)
          if (!icon) continue
          user32.symbols.SendMessageW(window, WM_SETICON, kind as never, icon)
          applied += 1
        }
      }
      return applied
    } catch (error) {
      console.error('Window icon could not be applied', error)
      return 0
    }
  }
}