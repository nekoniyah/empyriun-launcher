type LockableWindow = Window & { __lockdown?: boolean }

export function installLockdown(target: LockableWindow): void {
  if (target.__lockdown) return
  target.__lockdown = true
  const stop = (event: Event): void => {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  const blockedKey = (event: KeyboardEvent): boolean => {
    const command = event.ctrlKey || event.metaKey
    if (['F12', 'F5', 'F7', 'F3'].includes(event.key)) return true
    if (command && event.shiftKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyK', 'KeyR', 'KeyP'].includes(event.code)) return true
    if (event.metaKey && event.altKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyU'].includes(event.code)) return true
    if (command && ['KeyU', 'KeyS', 'KeyP', 'KeyR', 'KeyF', 'KeyG', 'KeyO', 'KeyL', 'Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code)) return true
    return event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
  }
  target.addEventListener('contextmenu', stop, true)
  target.addEventListener('keydown', (event) => { if (blockedKey(event)) stop(event) }, true)
  target.addEventListener('wheel', (event) => { if (event.ctrlKey) stop(event) }, { capture: true, passive: false })
  target.addEventListener('mousedown', (event) => { if (event.button === 1) stop(event) }, true)
  for (const type of ['auxclick', 'dragover', 'drop', 'dragstart', 'gesturestart']) target.addEventListener(type, stop, true)
}