/**
 * Sitzungs-Store. Hält den eingeloggten Versammlungsdatensatz, den lokalen
 * Namen und den Admin-Freischaltzustand. Daten liegen ausschließlich lokal
 * (Local-first); Nextcloud dient nur als optionaler Sync/Backup-Speicher.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CongregationData, StoredSession } from '../types'
import { storage } from '../services/storage'
import { hashPassword, verifyPassword, getDeviceKey, encryptWithKey } from '../services/crypto'
import { verifyAdmin } from '../services/backup'

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

export const useSessionStore = defineStore('session', () => {
  const congregation = ref<CongregationData | null>(null)
  const isAdminUnlocked = ref(storage.getSession().adminUnlocked === true)
  const session = ref<StoredSession>(storage.getSession())

  const congregationId = computed(() => session.value.congregationId)
  const isLoggedIn = computed(() => !!congregation.value)
  const canUnlock = computed(
    () => session.value.congregationId !== null && !isLoggedIn.value
  )
  const firstName = computed(() => session.value.profile.firstName)

  /** Baut die eingeloggte Sitzung wieder auf (ohne Passwortabfrage). */
  function restore(): boolean {
    const data = storage.getCongregation() as CongregationData | null
    if (!data) return false
    if (data.id !== session.value.congregationId) {
      session.value.congregationId = data.id
      persistSession()
    }
    congregation.value = data
    // Admin-Status aus der Sitzung übernehmen (wer mit Admin-Passwort
    // angemeldet war, bleibt auf diesem Gerät Admin).
    isAdminUnlocked.value = session.value.adminUnlocked === true
    return true
  }

  async function createCongregation(
    name: string,
    password: string,
    adminPassword: string,
    nextcloud?: { url: string; user: string; appPassword?: string }
  ): Promise<void> {
    const now = new Date().toISOString()
    const pass = await hashPassword(password)
    const admin = await hashPassword(adminPassword)
    const id = normalizeName(name) || `congr-${Date.now()}`
    let nc: CongregationData['nextcloud']
    if (nextcloud?.url) {
      nc = { url: nextcloud.url, user: nextcloud.user }
      // App-Passwort verschlüsselt ablegen, damit Live-Sync ohne erneute
      // Eingabe läuft (Geräteschlüssel, nie Klartext im Speicher).
      if (nextcloud.appPassword) {
        const key = await getDeviceKey()
        if (key) {
          const { iv, payload } = await encryptWithKey(nextcloud.appPassword, key)
          nc.appSecret = { iv, payload }
        }
      }
    }
    congregation.value = {
      id,
      name: name.trim(),
      passwordSalt: pass.salt,
      passwordHash: pass.hash,
      passwordIterations: pass.iterations,
      adminSalt: admin.salt,
      adminHash: admin.hash,
      adminIterations: admin.iterations,
      ...(nc ? { nextcloud: nc } : {}),
      createdAt: now,
      updatedAt: now,
    }
    storage.setCongregation(congregation.value)
    session.value.congregationId = id
    session.value.adminUnlocked = true // Ersteller ist Admin
    isAdminUnlocked.value = true
    persistSession()
  }

  /**
   * Meldet mit dem normalen ODER dem Admin-Passwort an. Mit dem Admin-Passwort
   * wird die Sitzung als Admin markiert (Verwaltungsfunktionen sichtbar).
   */
  async function login(congregationId: string, _name: string, password: string): Promise<boolean> {
    const data = storage.getCongregation() as CongregationData | null
    if (!data || data.id !== congregationId) return false

    const userOk = await verifyPassword(password, data.passwordSalt, data.passwordHash, data.passwordIterations)
    const adminOk = userOk
      ? false
      : await verifyPassword(password, data.adminSalt, data.adminHash, data.adminIterations)
    if (!userOk && !adminOk) return false

    congregation.value = data
    session.value.congregationId = data.id
    session.value.unlocked = true
    session.value.adminUnlocked = adminOk
    isAdminUnlocked.value = adminOk
    persistSession()
    return true
  }

  async function unlockAdmin(password: string): Promise<boolean> {
    if (!congregation.value) return false
    const ok = await verifyAdmin(password, congregation.value)
    if (ok) isAdminUnlocked.value = true
    return ok
  }

  function setFirstName(name: string): void {
    session.value.profile.firstName = name.trim()
    persistSession()
  }

  function clearFirstName(): void {
    session.value.profile.firstName = ''
    persistSession()
  }

  function logout(): void {
    congregation.value = null
    session.value.congregationId = null
    session.value.unlocked = false
    session.value.adminUnlocked = false
    isAdminUnlocked.value = false
    persistSession()
  }

  /** Löscht den gesamten lokalen Datensatz und meldet ab. */
  function resetAll(): void {
    storage.clearCongregation()
    storage.clearSession()
    congregation.value = null
    isAdminUnlocked.value = false
    session.value = {
      congregationId: null,
      unlocked: false,
      adminUnlocked: false,
      profile: { firstName: '' },
    }
  }

  function persistSession(): void {
    storage.setSession(session.value)
  }

  return {
    congregation,
    isAdminUnlocked,
    session,
    congregationId,
    isLoggedIn,
    canUnlock,
    firstName,
    restore,
    createCongregation,
    login,
    unlockAdmin,
    setFirstName,
    clearFirstName,
    logout,
    resetAll,
  }
})