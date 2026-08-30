/**
 * Sync-Store. Hält den Sync-Status (läuft/lastSync/Fehler), bündelt die
 * Kopplung/Bearbeitung der Nextcloud und den 2-Wege-Sync. Das Nextcloud-
 * App-Passwort wird mit dem Geräteschlüssel verschlüsselt abgelegt, damit
 * automatische Syncs ohne erneute Eingabe laufen.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import { useCongregationStore } from './congregation'
import { storage } from '../services/storage'
import { getDeviceKey, encryptWithKey, decryptWithKey } from '../services/crypto'
import { syncWithNextcloud, buildSnapshot } from '../services/sync'
import { NextcloudError } from '../types'
import type { NextcloudConfig } from '../types'

/** Entschlüsselt das gespeicherte App-Passwort (Geräteschlüssel). */
export async function decryptAppPassword(cfg: NextcloudConfig): Promise<string | null> {
  if (!cfg?.appSecret) return null
  const key = await getDeviceKey()
  if (!key) return null
  try {
    return await decryptWithKey(cfg.appSecret.payload, cfg.appSecret.iv, key)
  } catch {
    return null
  }
}

export const useSyncStore = defineStore('sync', () => {
  const isSyncing = ref(false)
  const lastSyncAt = ref<string | null>(storage.getSyncMeta()?.lastSyncAt ?? null)
  const syncError = ref('')
  const syncing = computed(() => isSyncing.value)
  const hasNextcloud = computed(() => !!useSessionStore().congregation?.nextcloud?.url)

  /** Koppelt Nextcloud und speichert das App-Passwort verschlüsselt. */
  async function link(cfg: NextcloudConfig, appPassword: string): Promise<void> {
    const session = useSessionStore()
    if (!session.congregation) throw new NextcloudError('sync.noCongregation')
    const key = await getDeviceKey()
    if (!key) throw new NextcloudError('keyring.unavailable')

    const { iv, payload } = await encryptWithKey(appPassword, key)
    session.congregation = {
      ...session.congregation,
      nextcloud: { url: cfg.url, user: cfg.user, appSecret: { iv, payload } },
      updatedAt: new Date().toISOString(),
    }
    storage.setCongregation(session.congregation)
    syncError.value = ''
  }

  /** Entfernt die Nextcloud-Kopplung. */
  async function unlink(): Promise<void> {
    const session = useSessionStore()
    if (!session.congregation) return
    const { nextcloud: _removed, ...rest } = session.congregation
    session.congregation = { ...rest }
    storage.setCongregation(session.congregation)
    lastSyncAt.value = null
    syncError.value = ''
    storage.setSyncMeta({ lastSyncAt: '' })
  }

  /**
   * Führt den 2-Wege-Sync mit den aktuellen lokalen Daten durch und wendet den
   * gemergten Versammlungszustand sowie die gemergten Items (Personen/Gruppen)
   * auf die Stores an.
   */
  async function syncNow(): Promise<'pushed' | 'pulled' | 'none'> {
    const session = useSessionStore()
    const congregation = useCongregationStore()
    if (!session.congregation) throw new NextcloudError('sync.noCongregation')
    const cfg = session.congregation?.nextcloud
    if (!cfg?.url || !cfg.user) throw new NextcloudError('sync.notConfigured')
    const appPassword = await decryptAppPassword(cfg)
    if (!appPassword) throw new NextcloudError('sync.noAppPassword')

    isSyncing.value = true
    syncError.value = ''
    try {
      const local = await buildSnapshot(session.congregation, congregation.items)
      const { snapshot, result } = await syncWithNextcloud(cfg, appPassword, local)
      session.congregation = { ...snapshot.congregation }
      storage.setCongregation(session.congregation)
      congregation.applyItems(snapshot.items)

      storage.setSyncMeta({ lastSyncAt: result.syncedAt })
      lastSyncAt.value = result.syncedAt
      if (result.error) syncError.value = result.error
      return result.pushed ? 'pushed' : result.pulled ? 'pulled' : 'none'
    } catch (e) {
      syncError.value = e instanceof Error ? e.message : 'sync.failed'
      throw e
    } finally {
      isSyncing.value = false
    }
  }

  return {
    hasNextcloud,
    syncing,
    isSyncing,
    lastSyncAt,
    syncError,
    link,
    unlink,
    syncNow,
  }
})