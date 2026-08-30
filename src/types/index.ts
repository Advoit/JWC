/**
 * Zentrale Datentypen. Die `version` im lokalen Speicher und im Backup-Format
 * dient der Datenmigration mit hoher Abwärtskompatibilität: alte Datensätze
 * werden an der Ladeschwelle migriert, neue Felder fehlerfrei ergänzt.
 */

/** Migrationsebene des lokalen Speichers. Bei Schema-Änderungen nur anheben. */
export const STORAGE_VERSION = 1

/** Migrationsebene des Backup-Formats. */
export const BACKUP_FORMAT = 'jwc-backup'

/** Format-Kennung des verschlüsselten Live-Sync-Snapshots. */
export const SYNC_FORMAT = 'jwc-sync'

/** Fehler, der bei Nextcloud-/Sync-Problemen geworfen wird. */
export class NextcloudError extends Error {}

export interface BackupMeta {
  format: typeof BACKUP_FORMAT
  version: number
  createdAt: string
  appVersion: string
}

export interface CongregationData {
  /** Eindeutiger, normalisierter Schlüssel der Versammlung (z. B. Name). */
  id: string
  name: string
  /** Salt + Iterationen, um Passwörter zu verifizieren. */
  passwordSalt: string
  passwordHash: string
  passwordIterations: number
  /** Admin-Passwort: verzögert für Verwaltung + Ableitung des Schlüssels. */
  adminSalt: string
  adminHash: string
  adminIterations: number
  /** Optionale Nextcloud-Verbindung. */
  nextcloud?: NextcloudConfig
  /** Weiterhin kennwortgeschützter Datenknoten (Inhalte). */
  payload?: unknown
  createdAt: string
  updatedAt: string
}

export interface SessionProfile {
  /** Vorname, nur lokal auf diesem Gerät gespeichert. */
  firstName: string
}

/** Persistierter Sitzungszustand auf diesem Gerät. */
export interface StoredSession {
  congregationId: string | null
  /** Zuletzt eingeloggt – erlaubt Rückkehr ohne erneute Passworteingabe. */
  unlocked: boolean
  /** Angemeldet mit dem Admin-Passwort → Verwaltungsfunktionen sichtbar. */
  adminUnlocked: boolean
  profile: SessionProfile
}

/** Einzelner lokal gespeicherter Eintrag (Start einer Erweiterung). */
export interface StoredItem<T = unknown> {
  id: string
  type: string
  data: T
  createdAt: string
  updatedAt: string
}

/** Item-Typen der Versammlungsinhalte. */
export const ITEM_TYPE_PERSON = 'person'
export const ITEM_TYPE_GROUP = 'group'
export const ITEM_TYPE_TREFFPUNKT = 'treffpunkt'
export const ITEM_TYPE_DOCUMENT = 'document'

/** Eine Person der Versammlung (nur lokal, kein Konto). */
export interface PersonData {
  firstName: string
  lastName: string
  /** Verborgen: erscheint nicht in öffentlichen Ansichten, bleibt in der Verwaltung. */
  hidden?: boolean
}

export type PersonItem = StoredItem<PersonData>

/** Eine Gruppe mit Leiter (dunkler Akzent) und Stellvertreter (heller Akzent). */
export interface GroupData {
  name: string
  /** Personen-ID des Leiters. */
  leaderId: string | null
  /** Personen-ID des Stellvertreters. */
  deputyId: string | null
  /** Personen-IDs der Teilnehmer (inkl. Leiter/Stellvertreter möglich). */
  memberIds: string[]
}

export type GroupItem = StoredItem<GroupData>

/** Ein Treffpunkt (predigen): Datum(en), Gruppe oder allgemein, Uhrzeit, Ort, Leiter. */
export interface TreffpunktData {
  /** ISO-Datumsangaben (YYYY-MM-DD); beliebig viele (mind. 1). */
  dates: string[]
  /** Allgemeiner Treffpunkt (kein Gruppennamen-Bezug). */
  general: boolean
  /** Zugeordnete Gruppen-ID (importiert aus Gruppen), bei allgemeinem Treffpunkt null. */
  groupId: string | null
  /** Uhrzeit im Format HH:MM. */
  time: string
  /** Ort (freier Text). */
  location: string
  /** Optionaler Leiter (freier Text-Name). */
  leaderName: string
}

export type TreffpunktItem = StoredItem<TreffpunktData>

/** Knoten im Dokumenten-Explorer (Ordner oder Datei). */
export interface DocumentNodeData {
  /** 'folder' für Ordner, 'file' für Dateien. */
  kind: 'folder' | 'file'
  /** Anzeigename inkl. Dateiendung bei Dateien. */
  name: string
  /** Übergeordneter Ordner (null = Wurzel). */
  parentId: string | null
  /** Freigegeben für normale Benutzer (nur Anzeige + Download). */
  shared: boolean
  /** MIME-Typ (bei Dateien), abgeleitet aus dem Namen. */
  mime?: string
  /** Dateigröße in Bytes (bei Dateien). */
  size?: number
}

export type DocumentNodeItem = StoredItem<DocumentNodeData>

/** Optional verschlüsseltes Nextcloud-App-Passwort (AES-GCM, Geräteschlüssel). */
export interface NextcloudConfig {
  url: string
  user: string
  /** AES-GCM-verschlüsseltes App-Passwort (nur für automatische Syncs). */
  appSecret?: { iv: string; payload: string }
}

/** Inhalt eines Live-Sync-Snapshots (verschlüsselt übertragen). */
export interface SyncSnapshot {
  format: typeof SYNC_FORMAT
  version: number
  updatedAt: string
  congregation: CongregationData
  items: StoredItem[]
}

/** Ergebnis eines Sync-Durchlaufs. */
export interface SyncResult {
  pushed: boolean
  pulled: boolean
  syncedAt: string
  error?: string
}

/** Struktur eines Backups zur Sicherung/Wiederherstellung. */
export interface BackupPayload {
  meta: BackupMeta
  congregation: CongregationData
  items: StoredItem[]
}