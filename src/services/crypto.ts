/**
 * Kryptographische Helfer auf Basis der Web Crypto API.
 * – PBKDF2 für Passwort-Hashing/-Verifizierung (Argon-schwer implementierbar).
 * – AES-GCM für die Verschlüsselung von Backups / Nextcloud-Daten (256-bit).
 * Der Schlüssel wird per PBKDF2 aus einem starken Geheimnis (Admin-Passwort)
 * abgeleitet; die verschlüsselten Daten sind ohne Passwort nicht lesbar,
 * weder lokal noch auf dem Server.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const DEFAULT_ITERATIONS = 210_000

function toBase64(input: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const bytes =
    input instanceof Uint8Array ? input : new Uint8Array(input)
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Gerätegebundener Schlüssels, um Geheimnisse (z. B. das Nextcloud-App-Passwort)
 * lokal verschlüsselt abzulegen – nicht im Klartext. Der Schlüssel selbst liegt
 * in localStorage (Sicherheit auf diesem Gerät, jedoch nie als Klartext im
 * Datenspeicher der App). Ermöglicht automatische Syncs nach Reload.
 */
const DEVICE_KEY_STORAGE = 'jwc.deviceKey'

function loadOrCreateDeviceKey(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE)
    if (existing) return existing
    const key = toBase64(randomBytes(32))
    window.localStorage.setItem(DEVICE_KEY_STORAGE, key)
    return key
  } catch {
    // Kein localStorage verfügbar (z. B. private Mode) – kryptografischer Nullwert.
    return ''
  }
}

export async function getDeviceKey(): Promise<CryptoKey | null> {
  const raw = loadOrCreateDeviceKey()
  if (!raw) return null
  return crypto.subtle.importKey(
    'raw',
    fromBase64(raw),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/** Verschlüsselt mit einem AES-GCM-Schlüsselobjekt. */
export async function encryptWithKey(
  text: string,
  key: CryptoKey
): Promise<{ iv: string; payload: string }> {
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  )
  return { iv: toBase64(iv), payload: toBase64(ciphertext) }
}

export async function decryptWithKey(
  payload: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(payload)
  )
  return decoder.decode(plain)
}

/** Erzeugt einen Hex-String als Salt (URL-sicher übernommen). */
export function randomSalt(byteLength = 16): string {
  return toBase64(randomBytes(byteLength))
}

/** Richtige Länge des PBKDF2-Hashs in Bits (32 Byte = SHA-256). */
const PBKDF2_KEY_BITS = 256

/** Führt die PBKDF2-Berechnung aus und liefert die rohen Hash-Bits. */
async function pbkdf2Bits(
  password: string,
  saltRaw: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<ArrayBuffer> {
  const material = await deriveMaterial(password, saltRaw, iterations)
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltRaw, iterations, hash: 'SHA-256' },
    material,
    PBKDF2_KEY_BITS
  )
}

/** Hasht das Passwort deterministisch (PBKDF2-SHA-256, 256 Bit). */
export async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt = randomBytes(16)
  const iterations = DEFAULT_ITERATIONS
  const bits = await pbkdf2Bits(password, salt, iterations)
  return { hash: toBase64(bits), salt: toBase64(salt), iterations }
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
  iterations: number
): Promise<boolean> {
  if (!password || !salt || !expectedHash) return false
  const bits = await pbkdf2Bits(password, fromBase64(salt), iterations)
  return toBase64(bits) === expectedHash
}

/**
 * Leitet das PBKDF2-Schlüsselmaterial aus einem Passwort ab. Das Ergebnis ist
 * nicht exportierbar und wird nur für deriveKey / deriveBits genutzt.
 */
async function deriveMaterial(
  password: string,
  _salt: Uint8Array<ArrayBuffer>,
  _iterations: number
): Promise<CryptoKey> {
  // Salt/Iterationen fließen in die eigentliche PBKDF2-Berechnung (deriveBits)
  // ein; hier wird nur das Importmaterial aus dem Passwort erzeugt.
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  // Der PBKDF2-Hash ist die tatsächliche Ausgabe (`deriveBits`), keine
  // Schlüsselexportierung – das ist der Grund, warum exportKey fehlschlug.
  return material
}

/**
 * Verschlüsselt Daten mit AES-GCM. Ausgabe ist "ivBase64.payloadBase64".
 * Der Passphrase-Schlüssel wird einmal pro Aufruf abgeleitet.
 */
export async function encrypt(
  text: string,
  passphrase: string,
  salt?: string,
  iterations = DEFAULT_ITERATIONS
): Promise<{ iv: string; payload: string; salt: string; iterations: number }> {
  const encSalt = salt ?? randomSalt()
  const saltRaw = fromBase64(encSalt)
  const material = await deriveMaterial(passphrase, saltRaw, iterations)
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltRaw, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  )
  return { iv: toBase64(iv), payload: toBase64(ciphertext), salt: encSalt, iterations }
}

export async function decrypt(
  payload: string,
  iv: string,
  passphrase: string,
  salt: string,
  iterations: number
): Promise<string> {
  const saltRaw = fromBase64(salt)
  const material = await deriveMaterial(passphrase, saltRaw, iterations)
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltRaw, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(payload)
  )
  return decoder.decode(plain)
}