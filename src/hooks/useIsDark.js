import { useSyncExternalStore } from 'react'

/** @param {() => void} onChange */
function subscribe(onChange) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

/**
 * Whether the dark theme is showing. Follows applyTheme(), including OS changes while the
 * theme is "system", because both only toggle the `dark` class on <html>.
 */
export function useIsDark() {
  return useSyncExternalStore(subscribe, isDark)
}
