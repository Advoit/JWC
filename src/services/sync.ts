/**
 * 2-Wege-Live-Synchronisation mit Nextcloud. Ein vollständiger Snapshot
 * (Versammlung + Inhalte) wird AES-GCM-verschlüsselt unter einem festen Pfad
 * gehalten. Beim Sync werden lokaler und entfernter Snapshot zusammengeführt:
 * einfache Felder gewinnen die neuere `updatedAt`, Einträge (items) werden
 * pro ID vereinigt (neuere Version gewinnt). Es läuft nie Klartext über die
 * Leitung oder den Server.
 */
import {
  SYNC_FORMAT,
  STORAGE_VERSION,
  NextcloudError,
} from '../types'
import type {
  CongregationData,
  NextcloudConfig,
  StoredItem,
  SyncResult,
  SyncSnapshot,
} from '../types'
import { putFile, getFile } from './nextcloud'
import { encrypt, decrypt, getDeviceKey, decryptWithKey } from './crypto'

const SYNC_FILENAME_PREFIX = 'jwc-sync'
const SYNC_FILENAME_SUFFIX = '.json'

function syncPath(congregationId: string): string {
  return `${SYNC_FILENAME_PREFIX}-${encodeURIComponent(congregationId)}${SYNC_FILENAME_SUFFIX}`
}


/**
 * Leitet den Snapshot-Schlüssel aus den Versammlungs-Credentials ab. Da
 * `adminHash`/`adminSalt`/`adminIterations` auf allen Geräten derselben
 * Versammlung identisch sind, kann jeder Browser den Snapshot entschlüsseln
 * (im Gegensatz zum Geräteschlüssel, der pro Profil unterschiedlich ist).
 * Der Server erhält weiterhin nur den verschlüsselten Blob.
 */
export function snapshotKey(congregation: CongregationData): {
  passphrase: string
  salt: string
  iterations: number
} {
  return {
    passphrase: congregation.adminHash,
    salt: congregation.adminSalt,
    iterations: congregation.adminIterations,
  }
}

/** Erstellt einen verschlüsselten Snapshot-String (Versammlungsschlüssel). */
export async function encryptSnapshot(
  snapshot: SyncSnapshot
): Promise<string> {
  const { passphrase, salt, iterations } = snapshotKey(snapshot.congregation)
  const { iv, payload } = await encrypt(
    JSON.stringify(snapshot),
    passphrase,
    salt,
    iterations
  )
  return JSON.stringify({ format: SYNC_FORMAT, iv, payload, salt, iterations })
}

/**
 * Entschlüsselt einen Snapshot-String mit dem Versammlungsschlüssel.
 * Fallback: alte Snapshots, die noch mit dem Geräteschlüssel verschlüsselt
 * wurden. Gibt `null` bei unpassendem Format/Passwort.
 */
export async function decryptSnapshot(
  raw: string,
  congregation: CongregationData
): Promise<SyncSnapshot | null> {
  try {
    const envelope = JSON.parse(raw) as {
      iv: string
      payload: string
      salt?: string
      iterations?: number
    }
    let plain: string | null = null
    if (envelope.salt && envelope.iterations) {
      // Aktuelles Format: Schlüssel aus Versammlungs-Credentials.
      const { passphrase } = snapshotKey(congregation)
      try {
        plain = await decrypt(
          envelope.payload,
          envelope.iv,
          passphrase,
          envelope.salt,
          envelope.iterations
        )
      } catch {
        plain = null
      }
    }
    // Abwärtskompatibilität: alte Geräteschlüssel-Variante versuchen.
    if (!plain) {
      const key = await getDeviceKey()
      if (key) {
        try {
          plain = await decryptWithKey(envelope.payload, envelope.iv, key)
        } catch {
          plain = null
        }
      }
    }
    if (!plain) return null
    const data = JSON.parse(plain) as SyncSnapshot
    if (data?.format !== SYNC_FORMAT) return null
    return data
  } catch {
    return null
  }
}

export async function buildSnapshot(
  congregation: CongregationData,
  items: StoredItem[]
): Promise<SyncSnapshot> {
  return {
    format: SYNC_FORMAT,
    version: STORAGE_VERSION,
    updatedAt: congregation.updatedAt,
    congregation,
    items,
  }
}

/**
 * Vereinigt lokalen und entfernten Snapshot (2-Wege). Einfache Felder der
 * Versammlung gewinnen die neuere updatedAt; `items` werden pro ID egalisiert
 * (neuere Version gewinnt). `pulledLocal` meldet, ob der lokale Stand durch
 * den Merge verändert wurde (d. h. Remote-Inhalte eingeflossen sind).
 */
export function mergeSnapshots(
  local: SyncSnapshot,
  remote: SyncSnapshot
): { merged: SyncSnapshot; pulledLocal: boolean } {
  const localNewer = local.updatedAt >= remote.updatedAt

  // Versammlung: neuere gewinnt komplett.
  const congregation: CongregationData = localNewer
    ? { ...local.congregation }
    : { ...remote.congregation }

  // Einträge nach ID vereinigen (neuere Version gewinnt).
  const byId = new Map<string, StoredItem>()
  for (const it of remote.items ?? []) {
    const cur = byId.get(it.id)
    if (!cur || it.updatedAt >= cur.updatedAt) byId.set(it.id, it)
  }
  for (const it of local.items ?? []) {
    const cur = byId.get(it.id)
    if (!cur || it.updatedAt >= cur.updatedAt) byId.set(it.id, it)
  }
  const items = Array.from(byId.values())

  const mergedUpdatedAt =
    local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt

  const merged: SyncSnapshot = {
    format: SYNC_FORMAT,
    version: STORAGE_VERSION,
    updatedAt: mergedUpdatedAt,
    congregation: { ...congregation, updatedAt: mergedUpdatedAt },
    items,
  }

  // Lokal wurde gezogen, wenn Remote neue/neuere Inhalte beigesteuert hat.
  const pulledLocal =
    !localNewer ||
    remote.items.some((r) => {
      const l = local.items.find((x) => x.id === r.id)
      return !l || r.updatedAt > l.updatedAt
    })

  return { merged, pulledLocal }
}

/**
 * Führt einen vollständigen Sync-Durchlauf aus:
 * 1. entfernter Snapshot laden, 2. mergen, 3. lokalen Zustand aktualisieren,
 * 4. gemergten Snapshot zurückspielen.
 * Gibt den gemergten Zustand zurück, damit der Aufrufer den lokalen Store
 * aktualisieren kann.
 */
export async function syncWithNextcloud(
  cfg: NextcloudConfig,
  appPassword: string,
  local: SyncSnapshot
): Promise<{ snapshot: SyncSnapshot; result: SyncResult }> {
  const remoteRaw = await getFile(cfg, appPassword, syncPath(local.congregation.id))

  if (!remoteRaw) {
    // Noch nie synchronisiert → erster Push.
    const blob = await encryptSnapshot(local)
    await putFile(cfg, appPassword, syncPath(local.congregation.id), blob)
    return {
      snapshot: local,
      result: { pushed: true, pulled: false, syncedAt: new Date().toISOString() },
    }
  }

  const remote = await decryptSnapshot(remoteRaw, local.congregation)
  if (!remote) {
    // Entfernte Datei unlesbar (fremder Inhalt, falscher Schlüssel, korrupt).
    // Nie blind überschreiben – das würde Daten anderer Geräte zerstören.
    throw new NextcloudError('sync.remoteUnreadable')
  }

  const { merged, pulledLocal } = mergeSnapshots(local, remote)
  // Push nur nötig, wenn der gemergte Stand vom entfernten abweicht – nicht vom
  // lokalen: Ist der lokale Stand bereits der neueste, muss er trotzdem hoch.
  const identical = JSON.stringify(merged) === JSON.stringify(remote)
  if (!identical) {
    const blob = await encryptSnapshot(merged)
    await putFile(cfg, appPassword, syncPath(local.congregation.id), blob)
  }
  return {
    snapshot: merged,
    result: {
      pushed: !identical,
      pulled: pulledLocal,
      syncedAt: new Date().toISOString(),
    },
  }
}