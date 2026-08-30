/**
 * Nextcloud-Zugriff über WebDAV (Basic Auth, HTTPS). Es werden ausschließlich
 * bereits AES-GCM-verschlüsselte Blobs übertragen – der Server erhält nie
 * Klartext. Dient als Transport für die 2-Wege-Live-Synchronisation.
 */
import { NextcloudError } from '../types'
import type { NextcloudConfig } from '../types'

/** HTTP-Fehler bei WebDAV-Aufrufen – erbt von NextcloudError, damit Aufrufer
 * alle Nextcloud-Probleme einheitlich behandeln können. */
export class NextcloudHttpError extends NextcloudError {
  status: number

  constructor(status: number) {
    super(`nextcloud.http${status}`)
    this.status = status
  }
}

/** Grund, weshalb eine Anfrage auf Netzwerkebene fehlschlägt. */
export type ConnectionReason = 'cors' | 'offline' | 'tls' | 'dns' | 'unknown'

/**
 * Netzwerkfehler bei WebDAV-Aufrufen, die keine HTTP-Antwort erreichen
 * (CORS-Blockade, TLS-/Zertifikatsfehler, Offline, DNS). Die Unterscheidung
 * hilft, dem Nutzer die richtige Diagnose anzuzeigen.
 */
export class NextcloudConnectionError extends NextcloudError {
  reason: ConnectionReason

  constructor(reason: ConnectionReason) {
    super(`nextcloud.conn.${reason}`)
    this.reason = reason
  }
}

/**
 * Prüft, ob der Host grundsätzlich erreichbar ist (ohne CORS zu brauchen).
 * Lassen `credentials: 'omit'` und `mode: 'no-cors'` einen Request durchkommen,
 * ist der Server erreichbar – ein späterer Fehler liegt dann (höchstwahrscheinlich)
 * an CORS. Wirft nie, liefert `false`, wenn selbst das scheitert.
 */
async function isHostReachable(base: string): Promise<boolean> {
  try {
    await fetch(base, { method: 'OPTIONS', mode: 'no-cors', credentials: 'omit', cache: 'no-store' })
    return true
  } catch {
    return false
  }
}

/**
 * Klassifiziert einen Fetch-TypeError zu einem nachvollziehbaren Grund.
 * `cors` = Server antwortet, aber der Browser blockiert die Antwort (Preflight).
 */
async function classifyFailure(base: string, err: unknown): Promise<NextcloudConnectionError> {
  const offline = typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine
  if (offline) return new NextcloudConnectionError('offline')
  const reachable = await isHostReachable(base)
  if (reachable) return new NextcloudConnectionError('cors')
  const msg = err instanceof Error ? err.message : ''
  // Kennzeichen für TLS-/Zertifikats- bzw. DNS-Probleme.
  if (/certificate|ssl|tls|self-signed|CERT_|err_/i.test(msg)) return new NextcloudConnectionError('tls')
  return new NextcloudConnectionError('dns')
}

/** Führt einen WebDAV-Fetch durch und übersetzt Netzwerkfehler in einen Diagnose-Fehler. */
async function davFetch<T>(
  base: string,
  init: RequestInit,
  fn: (res: Response) => Promise<T> | T
): Promise<T> {
  let res: Response
  try {
    res = await fetch(base, init)
  } catch (err) {
    throw await classifyFailure(base, err)
  }
  return fn(res)
}

/** Stellt die common WebDAV-URL zusammen. */
function davBase(cfg: NextcloudConfig, password: string, remotePath?: string): { url: string; init: RequestInit } {
  const base = `${normalizeDirs(cfg.url, cfg.user)}${remotePath ? `/${remotePath}` : ''}`
  return {
    url: base,
    init: { headers: { Authorization: authHeader(cfg.user, password) } },
  }
}

function normalize(url: string): string {
  let u = url.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  // Erzwinge TLS, außer für lokale Entwicklung (http://localhost).
  if (!/^https:\/\//i.test(u) && !/^http:\/\/localhost/i.test(u)) {
    throw new NextcloudError('nextcloud.httpsRequired')
  }
  return u
}

export function normalizeDirs(base: string, user: string): string {
  let u = normalize(base)
  // Idempotent: Entferne bereits angehängte Nextcloud-WebDAV-Pfadteile,
  // damit die URL nicht doppelt wird (egal ob Basis-URL oder volle Pfad-URL).
  u = u.replace(/\/remote\.php(?:\/dav(?:\/files\/[^/]+)?)?$/i, '')
  return `${u}/remote.php/dav/files/${encodeURIComponent(user)}`
}

function authHeader(user: string, password: string): string {
  return 'Basic ' + btoa(`${user}:${password}`)
}

/**
 * Hinterlegt einen verschlüsselten Blob unter einem festen Pfad (Überschreiben
 * für Live-Sync). `remotePath` liegt relativ zum WebDAV-Root des Nutzers.
 */
export async function putFile(
  cfg: NextcloudConfig,
  password: string,
  remotePath: string,
  body: string
): Promise<void> {
  const base = davBase(cfg, password, remotePath)
  await davFetch(base.url, { ...base.init, method: 'PUT', 'Content-Type': 'application/json', body } as RequestInit, (res) => {
    if (!res.ok) throw new NextcloudHttpError(res.status)
  })
}

/**
 * Legt eine binäre Datei unter einem Pfad ab (für Dokument-Inhalte).
 */
export async function putBlob(
  cfg: NextcloudConfig,
  password: string,
  remotePath: string,
  blob: Blob
): Promise<void> {
  const base = davBase(cfg, password, remotePath)
  await davFetch(base.url, { ...base.init, method: 'PUT', body: blob } as RequestInit, (res) => {
    if (!res.ok) throw new NextcloudHttpError(res.status)
  })
}

/**
 * Lädt eine Datei von WebDAV als Blob. Gibt `null` zurück, wenn der Pfad
 * (noch) nicht existiert (404).
 */
export async function getBlob(
  cfg: NextcloudConfig,
  password: string,
  remotePath: string
): Promise<Blob | null> {
  const base = davBase(cfg, password, remotePath)
  const blob = await davFetch(base.url, { ...base.init, method: 'GET' } as RequestInit, (res) => {
    if (res.status === 404) return null
    if (!res.ok) throw new NextcloudHttpError(res.status)
    return res.blob()
  })
  return blob
}

/**
 * Legt einen Ordner in WebDAV an (MKCOL). Wirft nur bei wirklich unerwarteten
 * Fehlern; 405 (existiert bereits) gilt als Erfolg.
 */
export async function makeDir(
  cfg: NextcloudConfig,
  password: string,
  remotePath: string
): Promise<void> {
  const base = davBase(cfg, password, remotePath)
  await davFetch(base.url, { ...base.init, method: 'MKCOL' } as RequestInit, (res) => {
    if (res.ok || res.status === 405) return
    throw new NextcloudHttpError(res.status)
  })
}

/**
 * Löscht eine Datei bzw. einen Ordner in WebDAV. Gibt `false`, wenn der Pfad
 * nicht existiert (404), andernfalls `true` bei Erfolg.
 */
export async function deleteFile(
  cfg: NextcloudConfig,
  password: string,
  remotePath: string
): Promise<boolean> {
  const base = davBase(cfg, password, remotePath)
  const r = await davFetch(base.url, { ...base.init, method: 'DELETE' } as RequestInit, (res) => {
    if (res.status === 404) return false
    if (!res.ok) throw new NextcloudHttpError(res.status)
    return true
  })
  return r
}

/**
 * Lädt einen verschlüsselten Blob von WebDAV. Gibt `null` zurück, wenn der
 * Pfad (noch) nicht existiert (404).
 */
export async function getFile(
  cfg: NextcloudConfig,
  password: string,
  remotePath: string
): Promise<string | null> {
  const base = davBase(cfg, password, remotePath)
  const text = await davFetch(base.url, { ...base.init, method: 'GET' } as RequestInit, (res) => {
    if (res.status === 404) return null
    if (!res.ok) throw new NextcloudHttpError(res.status)
    return res.text()
  })
  return text
}

/**
 * Prüft die Verbindung zu einer Nextcloud-Instanz, bevor sie gekoppelt wird.
 * Schlägt bei Erreichbarkeits-/Auth-/CORS-Problemen mit einem klassifizierten
 * Fehler fehl. Gibt bei Erfolg `true` zurück.
 */
export async function testConnection(
  cfg: Omit<NextcloudConfig, 'appSecret'>,
  password: string
): Promise<boolean> {
  // Ein GET auf das Benutzer-WebDAV-Root verifiziert Erreichbarkeit + Auth.
  const base = davBase(cfg as NextcloudConfig, password)
  await davFetch(base.url, { ...base.init, method: 'GET' } as RequestInit, (res) => {
    if (res.ok) return
    if (res.status === 404) {
      // Kein WebDAV-Root erreichbar → URL-Konstruktion prüfen.
      throw new NextcloudHttpError(404)
    }
    throw new NextcloudHttpError(res.status)
  })
  return true
}