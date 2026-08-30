/**
 * Reine Helfer für Versammlungsinhalte (Personen & Gruppen). Keine Seiteneffekte,
 * keine Speicherzugriffe – dadurch einfach testbar und wiederverwendbar (DRY).
 */
import { ITEM_TYPE_PERSON, ITEM_TYPE_GROUP, ITEM_TYPE_TREFFPUNKT } from '../types'
import type {
  GroupData,
  GroupItem,
  PersonData,
  PersonItem,
  StoredItem,
  TreffpunktItem,
} from '../types'

/** Vollständiger Name „Vorname Nachname“. */
export function personName(p: Pick<PersonData, 'firstName' | 'lastName'>): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || '–'
}

/** Sortiert Personen zuerst nach Nachname, dann nach Vorname (deutsche Sortierung). */
export function sortPeopleByLastName(people: PersonItem[]): PersonItem[] {
  return [...people].sort((a, b) => {
    const byLast = a.data.lastName.localeCompare(b.data.lastName, 'de')
    return byLast !== 0 ? byLast : a.data.firstName.localeCompare(b.data.firstName, 'de')
  })
}

/** Sortiert Gruppen alphabetisch nach Name. */
export function sortGroupsByName(groups: GroupItem[]): GroupItem[] {
  return [...groups].sort((a, b) => a.data.name.localeCompare(b.data.name, 'de'))
}

/** Nur sichtbare Personen (nicht verborgen). */
export function visiblePeople(people: PersonItem[]): PersonItem[] {
  return people.filter((p) => !p.data.hidden)
}

/** Filtert die Personen heraus, die zu den übergebenen IDs gehören. */
export function peopleByIds(people: PersonItem[], ids: string[]): PersonItem[] {
  const set = new Set(ids)
  return people.filter((p) => set.has(p.id))
}

/** Auflösung der Gruppenmitglieder (inkl. Leiter/Stellvertreter), nach Nachname sortiert. */
export function groupMembers(group: GroupItem, people: PersonItem[]): PersonItem[] {
  return sortPeopleByLastName(peopleByIds(people, group.data.memberIds))
}

/** Prüft, ob eine Person in der Gruppe eine Rolle hat (Leiter/Stellvertreter). */
export function hasRoleInGroup(group: GroupItem, personId: string): boolean {
  return group.data.leaderId === personId || group.data.deputyId === personId
}

/**
 * Prüft, ob eine Person der Gruppe zugehörig ist – als Leiter, Stellvertreter
 * oder Mitglied.
 */
export function isPersonInGroup(group: GroupItem, personId: string): boolean {
  return hasRoleInGroup(group, personId) || group.data.memberIds.includes(personId)
}

/**
 * Stellt sicher, dass Leiter und Stellvertreter immer Teilnehmer (memberIds)
 * ihrer Gruppe sind. Doppelte IDs werden entfernt.
 */
export function normalizeGroupData(data: GroupData): GroupData {
  const memberIds = new Set(data.memberIds ?? [])
  if (data.leaderId) memberIds.add(data.leaderId)
  if (data.deputyId) memberIds.add(data.deputyId)
  return { ...data, memberIds: [...memberIds] }
}

/**
 * Liefert jene Personen-IDs, die bereits in einer anderen Gruppe zugeordnet
 * sind (doppelte Vergabe). `targetGroupId` ist die gerade bearbeitete Gruppe;
 * ihre eigene bestehende Zuordnung zählt nicht als Konflikt.
 */
export function conflictingGroupAssignments(
  groups: GroupItem[],
  targetGroupId: string | null | undefined,
  personIds: string[]
): string[] {
  const others = groups.filter((g) => g.id !== targetGroupId)
  return personIds.filter((id) => others.some((g) => isPersonInGroup(g, id)))
}

/** Versammelt alle Inhalte eines Typs aus einer Item-Liste. */
export function itemsOfType<T>(items: StoredItem[], type: string): StoredItem<T>[] {
  return items.filter((i) => i.type === type) as StoredItem<T>[]
}

/** Sortiert Treffpunkte nach Datum (ISO, vergleichbar) und dann nach Uhrzeit. */
export function sortTreffpunkteByDate(treffpunkte: TreffpunktItem[]): TreffpunktItem[] {
  return [...treffpunkte].sort((a, b) => {
    const dateCmp = a.data.dates[0]?.localeCompare(b.data.dates[0] ?? '') ?? 0
    if (dateCmp !== 0) return dateCmp
    return a.data.time.localeCompare(b.data.time)
  })
}

/** Anzahl der Treffpunkte an einem konkreten Datum (über alle Datumsfelder). */
export function treffpunkteOnDate(treffpunkte: TreffpunktItem[], date: string): TreffpunktItem[] {
  return treffpunkte.filter((t) => t.data.dates.includes(date))
}

/**
 * Gruppiert Treffpunkte nach Datum und sortiert die Datumsgruppen aufsteigend
 * chronologisch und die Treffpunkte innerhalb nach Uhrzeit.
 */
export function groupTreffpunkteByDate(treffpunkte: TreffpunktItem[]): { date: string; items: TreffpunktItem[] }[] {
  const map = new Map<string, TreffpunktItem[]>()
  for (const t of sortTreffpunkteByDate(treffpunkte)) {
    for (const date of t.data.dates) {
      const list = map.get(date) ?? []
      list.push(t)
      map.set(date, list)
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({ date, items: [...items].sort((a, b) => a.data.time.localeCompare(b.data.time)) }))
}

/** Gruppenname eines Treffpunkts, sofern er einer Gruppe zugeordnet ist. */
export function treffpunktGroupName(t: TreffpunktItem, groupById: (id: string) => GroupItem | undefined): string | null {
  if (t.data.general || !t.data.groupId) return null
  const g = groupById(t.data.groupId)
  return g ? g.data.name : null
}

/**
 * Prüft, ob ein Treffpunkt für den aktuellen Benutzer relevant ist: er ist
 * allgemein (`general`) oder sein Leiter-Name enthält den eigenen Namen.
 * Der Vergleich ist normalisiert (klein, getrimmt) und unabhängig von Groß-/Kleinbuchstaben.
 */
export function isTreffpunktAssignedTo(t: TreffpunktItem, ownName: string): boolean {
  if (t.data.general) return true
  if (!ownName || !t.data.leaderName) return false
  return t.data.leaderName.trim().toLowerCase().includes(ownName.trim().toLowerCase())
}

/** Formatiert ein ISO-Datum (YYYY-MM-DD) zu einem Datumsobjekt. */
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function dateToIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Liefert das Iso-Datum des Montags der Woche, die `iso` enthält (Wochenstart Mo). */
export function mondayOfWeek(iso: string): string {
  const date = isoToDate(iso)
  const dow = (date.getDay() + 6) % 7 // Mo = 0 … So = 6
  date.setDate(date.getDate() - dow)
  return dateToIso(date)
}

/** ISO-Daten (Montag–Sonntag) der Woche, in der `iso` liegt. */
export function weekDates(iso: string): string[] {
  const monday = isoToDate(mondayOfWeek(iso))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return dateToIso(d)
  })
}

/** Treffpunkte, deren (mindestens eines) Datum in die Woche von `iso` fällt. */
export function treffpunkteInWeek(treffpunkte: TreffpunktItem[], iso: string): TreffpunktItem[] {
  const days = new Set(weekDates(iso))
  return treffpunkte.filter((t) => t.data.dates.some((d) => days.has(d)))
}

export { ITEM_TYPE_PERSON, ITEM_TYPE_GROUP, ITEM_TYPE_TREFFPUNKT }
