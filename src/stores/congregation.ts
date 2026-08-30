/**
 * Congregation-Store: hält die lokalen Versammlungsinhalte (Personen & Gruppen)
 * als StoredItems, persistiert sie pro Versammlung in localStorage und stellt
 * CRUD-Operationen bereit. Die Items fließen in Backup und Live-Sync ein.
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useSessionStore } from './session'
import { storage } from '../services/storage'
import { itemsOfType, normalizeGroupData } from '../services/congregation'
import { ITEM_TYPE_PERSON, ITEM_TYPE_GROUP, ITEM_TYPE_TREFFPUNKT, ITEM_TYPE_DOCUMENT } from '../types'
import type {
  DocumentNodeData,
  DocumentNodeItem,
  GroupData,
  GroupItem,
  PersonData,
  PersonItem,
  StoredItem,
  TreffpunktData,
  TreffpunktItem,
} from '../types'

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function now(): string {
  return new Date().toISOString()
}

export const useCongregationStore = defineStore('congregation', () => {
  const session = useSessionStore()
  const items = ref<StoredItem[]>([])

  /** Migriert ältere Datenformate (Abwärtskompatibilität). */
  function migrateItem(i: StoredItem): StoredItem {
    // Treffpunkte: früher `leaderId` (Personen-ID) → heute freier Text `leaderName`.
    if (i.type === ITEM_TYPE_TREFFPUNKT) {
      const d = i.data as Record<string, unknown>
      if ('leaderId' in d && typeof d.leaderId === 'string' && d.leaderId) {
        return {
          ...i,
          data: { ...d, leaderName: d.leaderId, leaderId: undefined },
        } as unknown as StoredItem
      }
    }
    return i
  }

  /** Lädt die Items der aktuell eingeloggten Versammlung (mit Migration). */
  function load(): void {
    const id = session.congregationId
    items.value = id ? storage.getItems(id).map(migrateItem) : []
  }

  // Bei Versammlungswechsel (Login/Logout) automatisch neu laden.
  watch(
    () => session.congregationId,
    () => load()
  )

  /** Schreibt die Items zurück in localStorage. */
  function persist(): void {
    const id = session.congregationId
    if (id) storage.setItems(id, items.value)
  }

  const people = computed<PersonItem[]>(() => itemsOfType<PersonData>(items.value, ITEM_TYPE_PERSON))
  const groups = computed<GroupItem[]>(() => itemsOfType<GroupData>(items.value, ITEM_TYPE_GROUP))
  const treffpunkte = computed<TreffpunktItem[]>(() => itemsOfType<TreffpunktData>(items.value, ITEM_TYPE_TREFFPUNKT))
  const documents = computed<DocumentNodeItem[]>(() => itemsOfType<DocumentNodeData>(items.value, ITEM_TYPE_DOCUMENT))

  function personById(id: string | null | undefined): PersonItem | undefined {
    if (!id) return undefined
    return people.value.find((p) => p.id === id)
  }

  function groupById(id: string | null | undefined): GroupItem | undefined {
    if (!id) return undefined
    return groups.value.find((g) => g.id === id)
  }

  /** Fügt eine neue Person hinzu und gibt sie zurück. */
  function addPerson(data: PersonData): PersonItem {
    const item: PersonItem = {
      id: newId(),
      type: ITEM_TYPE_PERSON,
      data: { ...data },
      createdAt: now(),
      updatedAt: now(),
    }
    items.value = [...items.value, item]
    persist()
    return item
  }

  /** Aktualisiert Felder einer Person (inkl. hidden). */
  function updatePerson(id: string, patch: Partial<PersonData>): void {
    items.value = items.value.map((i) =>
      i.type === ITEM_TYPE_PERSON && i.id === id
        ? { ...i, data: { ...(i as PersonItem).data, ...patch }, updatedAt: now() }
        : i
    )
    persist()
  }

  /**
   * Entfernt eine Person vollständig und bereinigt alle Gruppen
   * (Leiter/Stellvertreter/Mitglieder-Listen).
   */
  function removePerson(id: string): void {
    items.value = items.value
      .filter((i) => !(i.type === ITEM_TYPE_PERSON && i.id === id))
      .map((i) => {
        if (i.type !== ITEM_TYPE_GROUP) return i
        const g = i as GroupItem
        return {
          ...g,
          data: {
            ...g.data,
            leaderId: g.data.leaderId === id ? null : g.data.leaderId,
            deputyId: g.data.deputyId === id ? null : g.data.deputyId,
            memberIds: g.data.memberIds.filter((m) => m !== id),
          },
          updatedAt: now(),
        }
      })
    persist()
  }

  /** Fügt eine neue Gruppe hinzu (Leiter/Stellvertreter werden automatisch aufgenommen). */
  function addGroup(data: GroupData): GroupItem {
    const item: GroupItem = {
      id: newId(),
      type: ITEM_TYPE_GROUP,
      data: normalizeGroupData({ ...data }),
      createdAt: now(),
      updatedAt: now(),
    }
    items.value = [...items.value, item]
    persist()
    return item
  }

  /** Aktualisiert eine Gruppe (Name, Rollen, Mitglieder; Rollen werden aufgenommen). */
  function updateGroup(id: string, patch: Partial<GroupData>): void {
    items.value = items.value.map((i) =>
      i.type === ITEM_TYPE_GROUP && i.id === id
        ? {
            ...i,
            data: normalizeGroupData({
              ...(i as GroupItem).data,
              ...patch,
              memberIds: [...(patch.memberIds ?? (i as GroupItem).data.memberIds)],
            }),
            updatedAt: now(),
          }
        : i
    )
    persist()
  }

  function removeGroup(id: string): void {
    items.value = items.value.filter((i) => !(i.type === ITEM_TYPE_GROUP && i.id === id))
    persist()
  }

  function documentById(id: string | null | undefined): DocumentNodeItem | undefined {
    if (!id) return undefined
    return documents.value.find((d) => d.id === id)
  }

  /** Fügt einen Dokumenten-Knoten (Ordner/Datei) hinzu. */
  function addDocument(data: DocumentNodeData): DocumentNodeItem {
    const item: DocumentNodeItem = {
      id: newId(),
      type: ITEM_TYPE_DOCUMENT,
      data: { ...data },
      createdAt: now(),
      updatedAt: now(),
    }
    items.value = [...items.value, item]
    persist()
    return item
  }

  /** Aktualisiert einen Dokumenten-Knoten (Umbenennen, Verschieben, Teilen). */
  function updateDocument(id: string, patch: Partial<DocumentNodeData>): void {
    items.value = items.value.map((i) =>
      i.type === ITEM_TYPE_DOCUMENT && i.id === id
        ? { ...i, data: { ...(i as DocumentNodeItem).data, ...patch }, updatedAt: now() }
        : i
    )
    persist()
  }

  /** Entfernt einen Knoten (ohne Nachfahren-Aufräumen – Dateien in Droves gelöscht). */
  function removeDocument(id: string): void {
    items.value = items.value.filter((i) => !(i.type === ITEM_TYPE_DOCUMENT && i.id === id))
    persist()
  }

  function treffpunktById(id: string | null | undefined): TreffpunktItem | undefined {
    if (!id) return undefined
    return treffpunkte.value.find((t) => t.id === id)
  }

  /** Fügt einen neuen Treffpunkt hinzu. */
  function addTreffpunkt(data: TreffpunktData): TreffpunktItem {
    const item: TreffpunktItem = {
      id: newId(),
      type: ITEM_TYPE_TREFFPUNKT,
      data: { ...data, dates: [...data.dates] },
      createdAt: now(),
      updatedAt: now(),
    }
    items.value = [...items.value, item]
    persist()
    return item
  }

  /** Aktualisiert einen Treffpunkt. */
  function updateTreffpunkt(id: string, patch: Partial<TreffpunktData>): void {
    items.value = items.value.map((i) =>
      i.type === ITEM_TYPE_TREFFPUNKT && i.id === id
        ? {
            ...i,
            data: {
              ...(i as TreffpunktItem).data,
              ...patch,
              dates: [...(patch.dates ?? (i as TreffpunktItem).data.dates)],
            },
            updatedAt: now(),
          }
        : i
    )
    persist()
  }

  function removeTreffpunkt(id: string): void {
    items.value = items.value.filter((i) => !(i.type === ITEM_TYPE_TREFFPUNKT && i.id === id))
    persist()
  }

  /** Übernimmt die Items nach einem Sync/Import (ersetzt den lokalen Stand). */
  function applyItems(next: StoredItem[]): void {
    items.value = [...next]
    persist()
  }

  /** Aktualisiert die Gruppenmitglieder-Liste (inkl. Rollen-Bereinigung). */
  function setGroupMembers(groupId: string, memberIds: string[]): void {
    updateGroup(groupId, { memberIds })
  }

  return {
    items,
    people,
    groups,
    treffpunkte,
    documents,
    personById,
    groupById,
    treffpunktById,
    documentById,
    load,
    addPerson,
    updatePerson,
    removePerson,
    addGroup,
    updateGroup,
    removeGroup,
    addTreffpunkt,
    updateTreffpunkt,
    removeTreffpunkt,
    addDocument,
    updateDocument,
    removeDocument,
    applyItems,
    setGroupMembers,
  }
})
