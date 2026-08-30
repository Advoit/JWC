/**
 * 2-Wege-Live-Sync-Test mit zwei simulierten Browser-Profilen. Jedes Profil
 * besitzt ein eigenes `window.localStorage` (damit auch einen anderen
 * Geräteschlüssel) – genau wie zwei echte Browser. Beide teilen sich einen
 * In-Memory-WebDAV-Server. Regressionsfall: Der Snapshot darf NICHT mit dem
 * Geräteschlüssel verschlüsselt sein, sonst kann Profil B Profil A's Snapshot
 * nicht lesen und würde ihn überschreiben.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { hashPassword } from './crypto'
import { encryptSnapshot, decryptSnapshot, mergeSnapshots, syncWithNextcloud } from './sync'
import { SYNC_FORMAT, STORAGE_VERSION } from '../types'
import type { CongregationData, NextcloudConfig, StoredItem, SyncSnapshot } from '../types'

/* ---------- Fake-WebDAV (gemeinsamer „Server") ---------- */

function makeWebDav() {
  const files = new Map<string, string>()
  const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
    const path = new URL(url).pathname
    if (init?.method === 'PUT') {
      files.set(path, String(init.body))
      return new Response(null, { status: 201 })
    }
    if (files.has(path)) {
      return new Response(files.get(path), { status: 200 })
    }
    return new Response('Not Found', { status: 404 })
  }
  return { files, fetchImpl }
}

/* ---------- Simulierte Browser-Profile ---------- */

function makeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  }
}

/** Aktiviert „Profil" als aktiven Browser-Kontext (eigenes localStorage). */
function activateProfile(profile: { localStorage: ReturnType<typeof makeLocalStorage> }) {
  ;(globalThis as unknown as { window: unknown }).window = { localStorage: profile.localStorage }
}

/* ---------- Testdaten ---------- */

const NC: NextcloudConfig = { url: 'http://localhost:8000', user: 'testuser' }
const APP_PW = 'app-password-123'

async function makeCongregation(name: string): Promise<CongregationData> {
  const pass = await hashPassword('user-pass')
  const admin = await hashPassword('admin-pass')
  const now = new Date().toISOString()
  return {
    id: `congr-${name}`,
    name,
    passwordSalt: pass.salt,
    passwordHash: pass.hash,
    passwordIterations: pass.iterations,
    adminSalt: admin.salt,
    adminHash: admin.hash,
    adminIterations: admin.iterations,
    createdAt: now,
    updatedAt: now,
  }
}

function makeItem(id: string, updatedAt: string, data: Record<string, unknown> = {}): StoredItem {
  return { id, type: 'test', data, createdAt: updatedAt, updatedAt }
}

function snapshot(congregation: CongregationData, items: StoredItem[], updatedAt?: string): SyncSnapshot {
  return {
    format: SYNC_FORMAT,
    version: STORAGE_VERSION,
    updatedAt: updatedAt ?? congregation.updatedAt,
    congregation: { ...congregation, updatedAt: updatedAt ?? congregation.updatedAt },
    items,
  }
}

/* ---------- Tests ---------- */

describe('2-Wege-Live-Sync über zwei Profile', () => {
  let webdav: ReturnType<typeof makeWebDav>
  let profileA: { localStorage: ReturnType<typeof makeLocalStorage> }
  let profileB: { localStorage: ReturnType<typeof makeLocalStorage> }
  let congr: CongregationData

  beforeEach(async () => {
    webdav = makeWebDav()
    profileA = { localStorage: makeLocalStorage() }
    profileB = { localStorage: makeLocalStorage() }
    congr = await makeCongregation('Musterversammlung')
    ;(globalThis as unknown as { fetch: unknown }).fetch = webdav.fetchImpl as unknown as typeof fetch
  })

  afterEach(() => {
    ;(globalThis as unknown as { fetch: unknown }).fetch = undefined
  })

  it('Profil A pusht erstmalig, Profil B zieht und mergt', async () => {
    activateProfile(profileA)
    const localA = snapshot(congr, [makeItem('a1', '2026-01-01T10:00:00.000Z')], '2026-01-01T10:00:00.000Z')

    const resA = await syncWithNextcloud(NC, APP_PW, localA)
    expect(resA.result.pushed).toBe(true)
    expect(resA.result.pulled).toBe(false)

    // Profil B: gleiche Versammlung, aber leerer lokaler Stand.
    activateProfile(profileB)
    const localB = snapshot(congr, [], '2026-01-01T09:00:00.000Z')

    const resB = await syncWithNextcloud(NC, APP_PW, localB)
    expect(resB.result.pulled).toBe(true)
    expect(resB.snapshot.items.map((i) => i.id)).toContain('a1')
    expect(resB.snapshot.items.length).toBe(1)
  })

  it('Verschlüsselter Snapshot ist geräteübergreifend lesbar (Regressionsfall Geräteschlüssel)', async () => {
    // Profil A verschlüsselt mit seinem (eigenen) Gerätekontext.
    activateProfile(profileA)
    const localA = snapshot(congr, [makeItem('x', '2026-01-01T10:00:00.000Z')])
    const blob = await encryptSnapshot(localA)

    // Klartext darf nicht im Blob stehen.
    expect(blob).not.toContain('Musterversammlung')

    // Profil B (anderer Geräteschlüssel!) muss entschlüsseln können.
    activateProfile(profileB)
    const decrypted = await decryptSnapshot(blob, congr)
    expect(decrypted).not.toBeNull()
    expect(decrypted?.items[0]?.id).toBe('x')
  })

  it('Beide Profile fügen hinzu → Merge vereinigt ohne Verlust', async () => {
    activateProfile(profileA)
    await syncWithNextcloud(NC, APP_PW, snapshot(congr, [], '2026-01-01T10:00:00.000Z'))

    // A fügt a1 hinzu und pusht.
    const a1 = makeItem('a1', '2026-01-02T10:00:00.000Z')
    await syncWithNextcloud(NC, APP_PW, snapshot(congr, [a1], '2026-01-02T10:00:00.000Z'))

    // B fügt b1 hinzu und pusht (ohne a1 lokal gesehen zu haben).
    activateProfile(profileB)
    const b1 = makeItem('b1', '2026-01-03T10:00:00.000Z')
    const resB = await syncWithNextcloud(NC, APP_PW, snapshot(congr, [b1], '2026-01-03T10:00:00.000Z'))

    expect(resB.snapshot.items.map((i) => i.id).sort()).toEqual(['a1', 'b1'])
  })

  it('Konflikt: neuere Version desselben Items gewinnt', async () => {
    activateProfile(profileA)
    await syncWithNextcloud(NC, APP_PW, snapshot(congr, [], '2026-01-01T10:00:00.000Z'))

    // A editiert das Item (neu).
    const newer = makeItem('item1', '2026-01-05T10:00:00.000Z', { text: 'neu von A' })
    await syncWithNextcloud(NC, APP_PW, snapshot(congr, [newer], '2026-01-05T10:00:00.000Z'))

    // B editiert dasselbe Item (älter).
    activateProfile(profileB)
    const older = makeItem('item1', '2026-01-04T10:00:00.000Z', { text: 'alt von B' })
    const resB = await syncWithNextcloud(NC, APP_PW, snapshot(congr, [older], '2026-01-04T10:00:00.000Z'))

    const merged = resB.snapshot.items.find((i) => i.id === 'item1')
    expect(merged?.data).toEqual({ text: 'neu von A' })
  })

  it('Unlesbare Remote-Datei wird NICHT überschrieben (kein Datenverlust)', async () => {
    activateProfile(profileA)
    // Erstpush.
    await syncWithNextcloud(NC, APP_PW, snapshot(congr, [makeItem('a1', '2026-01-01T10:00:00.000Z')]))

    // Remote-Datei wird von außen korrupt/fremd überschrieben.
    const path = '/remote.php/dav/files/testuser/jwc-sync-congr-Musterversammlung.json'
    webdav.files.set(path, '{"format":"jwc-sync","iv":"boom","payload":"kaputt"}')

    activateProfile(profileB)
    await expect(
      syncWithNextcloud(NC, APP_PW, snapshot(congr, [], '2026-01-02T10:00:00.000Z'))
    ).rejects.toThrow('sync.remoteUnreadable')

    // Remote-Inhalt bleibt unangetastet (kein Überschreiben mit lokalem Stand).
    expect(webdav.files.get(path)).toBe('{"format":"jwc-sync","iv":"boom","payload":"kaputt"}')
  })

  it('mergeSnapshots: neuere Versammlung gewinnt, Items vereinigt', () => {
    const local = snapshot(congr, [makeItem('a', '2026-01-01T10:00:00.000Z')], '2026-01-02T10:00:00.000Z')
    const remote = snapshot(congr, [makeItem('b', '2026-01-03T10:00:00.000Z')], '2026-01-03T10:00:00.000Z')

    const { merged, pulledLocal } = mergeSnapshots(local, remote)
    expect(merged.updatedAt).toBe('2026-01-03T10:00:00.000Z')
    expect(merged.items.map((i) => i.id).sort()).toEqual(['a', 'b'])
    expect(pulledLocal).toBe(true)
  })
})