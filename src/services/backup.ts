/**
 * Sicherung & Wiederherstellung. Erzeugt eine mit AES-GCM verschlüsselte
 * JSON-Sicherung (Admin-Passwort als Passphrase). Beim Wiederherstellen wird
 * das verschlüsselte Dateiformat geprüft und nach Passwort-Eingabe entschlüsselt.
 */
import {
  BACKUP_FORMAT,
  STORAGE_VERSION,
} from '../types'
import type { BackupPayload, CongregationData } from '../types'
import { decrypt, encrypt, verifyPassword } from './crypto'

export const BACKUP_MIME = 'application/json'

export class BackupError extends Error {}

/** Erstellt einen verschlüsselten Backup-String aus den Versammlungsdaten. */
export async function createBackup(
  congregation: CongregationData,
  items: BackupPayload['items'],
  passphrase: string
): Promise<string> {
  const plain: BackupPayload = {
    meta: {
      format: BACKUP_FORMAT,
      version: STORAGE_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: __APP_VERSION__,
    },
    congregation,
    items,
  }
  const { iv, payload, salt, iterations } = await encrypt(
    JSON.stringify(plain),
    passphrase
  )
  return JSON.stringify({ version: STORAGE_VERSION, iv, salt, iterations, payload })
}

/**
 * Prüft, ob eine hochgeladene Datei ein valides JWC-Backup ist, und entschlüsselt
 * es mit dem Admin-Passwort. Schlägt bei falschem Passwort fehl.
 */
export async function verifyAndDecryptBackup(
  file: string,
  adminPassword: string
): Promise<BackupPayload> {
  let envelope: {
    version: number
    iv: string
    salt: string
    iterations: number
    payload: string
  }
  try {
    envelope = JSON.parse(file)
  } catch {
    throw new BackupError('backup.invalidFile')
  }

  if (!envelope || typeof envelope.payload !== 'string') {
    throw new BackupError('backup.invalidFile')
  }

  let plain: string
  try {
    plain = await decrypt(
      envelope.payload,
      envelope.iv,
      adminPassword,
      envelope.salt,
      envelope.iterations
    )
  } catch {
    throw new BackupError('backup.wrongPassword')
  }

  let data: BackupPayload
  try {
    data = JSON.parse(plain) as BackupPayload
  } catch {
    throw new BackupError('backup.corrupt')
  }

  if (data.meta?.format !== BACKUP_FORMAT || !data.congregation) {
    throw new BackupError('backup.notJwc')
  }
  return data
}

/** Migriert einen zuvor gesicherten Payload auf die aktuelle Version. */
export function migrateBackup(data: BackupPayload): BackupPayload {
  const moved = { ...data, congregation: { ...data.congregation } }
  return moved
}

/** Verifiziert das übergebene Admin-Passwort gegen den gesicherten Hash. */
export async function verifyAdmin(
  password: string,
  congr: Pick<CongregationData, 'adminSalt' | 'adminHash' | 'adminIterations'>
): Promise<boolean> {
  return verifyPassword(password, congr.adminSalt, congr.adminHash, congr.adminIterations)
}

export { verifyPassword }