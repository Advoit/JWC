/**
 * Reaktiver Online/Offline-Zustand über den navigator.onLine und die
 * `online`/`offline`-Events. Treibt das offline-Hinweisbanner an.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useOffline() {
  const isOnline = ref(navigator.onLine)

  function goOnline() {
    isOnline.value = true
  }
  function goOffline() {
    isOnline.value = false
  }

  onMounted(() => {
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
  })

  return { isOnline }
}