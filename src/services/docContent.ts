/**
 * Speicherung von Dokument-Inhalten (die Datei-Bytes). Der bevorzugte Ort ist
 * die Nextcloud (WebDAV), verschlüsselt mit dem Versammlungsschlüssel – auf dem
 * Server liegt nie Klartext. Ohne gekoppelte Nextcloud fällt der Inhalt zurück
 * auf localStorage (nur gerätelokal, Basis-Fallback).
 */
import type { CongregationData, NextcloudConfig } from '../types'
import { decrypt, encrypt } from './crypto'
import { putBlob, getBlob, deleteFile } from './nextcloud'
import { snapshotKey } from './sync'

const DOC_FORMAT = 'jwc-doc'
const LOCAL_PREFIX = 'jwc.docContent'
const NC_DIR = 'jwc-docs'

function localKey(congId: string): string {
  return `${LOCAL_PREFIX}.${congId}`
}

/** Relativer Nextcloud-Pfad für ein Dokument (stabile ID → Umbenennen/Verschieben bleibt gültig). */
export function docRemotePath(congId: string, docId: string): string {
  return `${NC_DIR}/${encodeURIComponent(congId)}/${docId}`
}

export interface DocLocation {
  mode: 'nextcloud' | 'local'
  cfg?: NextcloudConfig
  appPassword?: string
  congId: string
}

function toBase64(data: unknown): string {
  return window.btoa(JSON.stringify(data))
}

function fromBase64< T>(b64: string): T {
  return JSON.parse(window.atob(b64)) as T
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return window.btoa(binary)
}

function base64ToBlob(b64: string, mime: string): Blob {
  const binary = window.atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Verschlüsselt einen Dokument-Inhalt (Blob) zu einem transportierbaren String. */
async function encryptDoc(
  blob: Blob,
  congregation: CongregationData
): Promise<{ envelope: string; mime: string }> {
  const b64 = await blobToBase64(blob)
  const { passphrase, salt, iterations } = snapshotKey(congregation)
  const { iv, payload } = await encrypt(JSON.stringify({ mime: blob.type, b64 }), passphrase, salt, iterations)
  return {
    envelope: toBase64({ format: DOC_FORMAT, iv, payload, mime: blob.type }),
    mime: blob.type,
  }
}

/** Entschlüsselt einen gespeicherten Dokument-Inhalt zu einem Blob. */
async function decryptDoc(envelope: string, congregation: CongregationData): Promise<Blob> {
  const box = fromBase64<{ format: string; iv: string; payload: string }>(envelope)
  const { passphrase, salt, iterations } = snapshotKey(congregation)
  const plain = JSON.parse(await decrypt(box.payload, box.iv, passphrase, salt, iterations)) as {
    mime: string
    b64: string
  }
  return base64ToBlob(plain.b64, plain.mime)
}

/** Schreibt den Inhalt eines Dokuments (cloud oder lokal). */
export async function writeDocContent(
  loc: DocLocation,
  congregation: CongregationData,
  docId: string,
  blob: Blob
): Promise<void> {
  const { envelope } = await encryptDoc(blob, congregation)
  if (loc.mode === 'nextcloud' && loc.cfg && loc.appPassword) {
    const file = new Blob([envelope], { type: 'application/json' })
    await putBlob(loc.cfg, loc.appPassword, docRemotePath(loc.congId, docId), file)
    return
  }
  // Lokaler Fallback: gesamte Map für die Versammlung als JSON lesen/schreiben.
  const map = readLocalMap(loc.congId)
  map[docId] = envelope
  writeLocalMap(loc.congId, map)
}

/** Liest den Inhalt eines Dokuments. Gibt null, wenn (noch) nicht vorhanden. */
export async function readDocContent(
  loc: DocLocation,
  congregation: CongregationData,
  docId: string
): Promise<Blob | null> {
  let env: string | null = null
  if (loc.mode === 'nextcloud' && loc.cfg && loc.appPassword) {
    const blob = await getBlob(loc.cfg, loc.appPassword, docRemotePath(loc.congId, docId))
    env = blob ? await blob.text() : null
  } else {
    const map = readLocalMap(loc.congId)
    env = map[docId] ?? null
  }
  if (!env) return null
  return decryptDoc(env, congregation)
}

/** Entfernt den Inhalt eines Dokuments (cloud oder lokal). */
export async function deleteDocContent(loc: DocLocation, docId: string): Promise<void> {
  if (loc.mode === 'nextcloud' && loc.cfg && loc.appPassword) {
    await deleteFile(loc.cfg, loc.appPassword, docRemotePath(loc.congId, docId))
    return
  }
  const map = readLocalMap(loc.congId)
  delete map[docId]
  writeLocalMap(loc.congId, map)
}

function readLocalMap(congId: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(localKey(congId))
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeLocalMap(congId: string, map: Record<string, string>): void {
  try {
    window.localStorage.setItem(localKey(congId), JSON.stringify(map))
  } catch {
    /* Kapazität erschöpft – Inhalt bleibt unverändert im Speicher. */
  }
}