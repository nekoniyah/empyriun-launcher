export function dismissOnOutside(root: HTMLElement, close: () => void): () => void {
  const onPress = (event: PointerEvent): void => {
    if (!root.contains(event.target as Node)) close()
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close()
  }
  document.addEventListener('pointerdown', onPress, true)
  document.addEventListener('keydown', onKey, true)
  return () => {
    document.removeEventListener('pointerdown', onPress, true)
    document.removeEventListener('keydown', onKey, true)
  }
}