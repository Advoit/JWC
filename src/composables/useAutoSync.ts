/**
 * Verdrahtet den 2-Wege-Live-Sync: initialer Pull beim Öffnen der App
 * (wenn Nextcloud gekoppelt), automatischer Push bei Datenänderungen
 * (debounced) und erneuter Sync, sobald die Verbindung zurückkehrt.
 */
import { watch, onMounted, onBeforeUnmount } from 'vue'
import { useSessionStore } from '../stores/session'
import { useCongregationStore } from '../stores/congregation'
import { useSyncStore } from '../stores/sync'
import { useOffline } from './useOffline'

const PUSH_DEBOUNCE_MS = 1500

export function useAutoSync() {
  const session = useSessionStore()
  const congregation = useCongregationStore()
  const sync = useSyncStore()
  const { isOnline } = useOffline()

  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let lastSignature = ''

  function signature(): string {
    return JSON.stringify({ congregation: session.congregation, items: congregation.items })
  }

  async function runSync(): Promise<void> {
    if (!session.isLoggedIn || !sync.hasNextcloud || !isOnline.value) return
    try {
      await sync.syncNow()
      lastSignature = signature()
    } catch {
      /* Fehler still schlucken – Status liegt im Store */
    }
  }

  function schedulePush(): void {
    if (!session.isLoggedIn || !sync.hasNextcloud || !isOnline.value) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      // Vom Sync selbst zurückgespielte Daten erneut zu pushen ist unnötig.
      if (signature() === lastSignature) return
      runSync()
    }, PUSH_DEBOUNCE_MS)
  }

  // Datenänderungen pushen (tief beobachtet, debounced) – Versammlung und Items.
  watch(
    () => session.congregation,
    () => schedulePush(),
    { deep: true }
  )
  watch(
    () => congregation.items,
    () => schedulePush(),
    { deep: true }
  )

  // Verbindung zurück → nachholen.
  watch(isOnline, (online) => {
    if (online) runSync()
  })

  onMounted(() => {
    runSync()
  })

  onBeforeUnmount(() => {
    if (pushTimer) clearTimeout(pushTimer)
  })

  return { runSync }
}