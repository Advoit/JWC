/**
 * Reaktives Theme-Composable. Hält den gewählten Modus (System/Hell/Dunkel),
 * wendet ihn auf <html> an und verfolgt System-Änderungen im System-Modus.
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  getStoredTheme,
  storeTheme,
  applyTheme,
  watchSystemTheme,
} from '../services/theme'
import type { ThemeMode } from '../services/theme'

export function useTheme() {
  const mode = ref<ThemeMode>(getStoredTheme())

  function setMode(next: ThemeMode): void {
    mode.value = next
    storeTheme(next)
    applyTheme(next)
  }

  let stopWatching: (() => void) | null = null

  onMounted(() => {
    applyTheme(mode.value)
    stopWatching = watchSystemTheme(() => mode.value)
  })

  watch(mode, (next) => applyTheme(next))

  onBeforeUnmount(() => {
    stopWatching?.()
  })

  return { mode, setMode }
}