/**
 * Lokaler, versionierter Speicher. Ein einziger Namespace je Versammlung hält
 * Account + Inhalte. Die `STORAGE_VERSION` (siehe types) ermöglicht Migration:
 * Beim Laden werden alte Versionen schrittweise auf die aktuelle angehoben,
 * sodass Daten aus älteren App-Versionen erhalten bleiben (Abwärtskompatibilität).
 */
import { STORAGE_VERSION } from '../types'
import type { StoredItem, StoredSession } from '../types'

const NS = 'jwc'
const VERSION_KEY = 'jwc.storageVersion'
const SESSION_KEY = 'jwc.session'
const SYNC_KEY = 'jwc.syncMeta'

function itemsKey(congregationId: string): string {
  return `jwc.items.${congregationId}`
}

function readNumber(key: string, fallback: number): number {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : Number(raw)
  } catch {
    return fallback
  }
}

function writeNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    /* Kapazität erschöpft – Daten bleiben im Speicher haften. */
  }
}

function safeGet<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function safeSet(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value))
}

/**
 * Migriert einen geladenen Datensatz von `storedVersion` auf die aktuelle
 * Version. Alte Versionen (≤ STORAGE_VERSION) werden unverändert übernommen;
 * zukünftige, unbekannte Versionen werden defensiv behandelt.
 */
export function migrate<T>(storedVersion: number, data: T): T {
  if (storedVersion <= STORAGE_VERSION) return data
  // Unbekannte, neuere Formate werden unverändert gelassen und zurückgegeben.
  return data
}

export const storage = {
  get congregationVersion(): number {
    return readNumber(VERSION_KEY, 1)
  },

  /** Liest einen Versammlungsdatensatz und führt die Migration durch. */
  getCongregation(): unknown | null {
    const version = this.congregationVersion
    const data = safeGet<unknown>(NS)
    if (!data) return null
    return migrate(version, data)
  },

  setCongregation(data: unknown): void {
    writeNumber(VERSION_KEY, STORAGE_VERSION)
    safeSet(NS, data)
  },

  clearCongregation(): void {
    window.localStorage.removeItem(NS)
    writeNumber(VERSION_KEY, STORAGE_VERSION)
  },

  /** Liest alle lokalen Inhalte (Personen, Gruppen …) einer Versammlung. */
  getItems(congregationId: string): StoredItem[] {
    return safeGet<StoredItem[]>(itemsKey(congregationId)) ?? []
  },

  setItems(congregationId: string, items: StoredItem[]): void {
    safeSet(itemsKey(congregationId), items)
  },

  clearItems(congregationId: string): void {
    window.localStorage.removeItem(itemsKey(congregationId))
  },

  getSession(): StoredSession {
    return (
      safeGet<StoredSession>(SESSION_KEY) ?? {
        congregationId: null,
        unlocked: false,
        adminUnlocked: false,
        profile: { firstName: '' },
      }
    )
  },

  setSession(session: StoredSession): void {
    safeSet(SESSION_KEY, session)
  },

  clearSession(): void {
    window.localStorage.removeItem(SESSION_KEY)
  },

  /** Dauerhaft gewählte Sprache. */
  setLanguage(lang: string): void {
    window.localStorage.setItem('jwc.lang', lang)
  },

  /** Priorer Sync-Zeitpunkt, lokal gehalten für Statusanzeige. */
  getSyncMeta(): { lastSyncAt?: string } | null {
    return safeGet<{ lastSyncAt?: string }>(SYNC_KEY)
  },

  setSyncMeta(meta: { lastSyncAt: string }): void {
    safeSet(SYNC_KEY, meta)
  },
}