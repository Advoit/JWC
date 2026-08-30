/**
 * Tests für die reinen Gruppen-/Personen-Helfer: Sortierung nach Nachname,
 * Sichtbarkeit (verborgen) und Rollen-Zugehörigkeit.
 */
import { describe, it, expect } from 'vitest'
import {
  personName,
  sortPeopleByLastName,
  visiblePeople,
  groupMembers,
  hasRoleInGroup,
  isPersonInGroup,
  normalizeGroupData,
  conflictingGroupAssignments,
  sortTreffpunkteByDate,
  groupTreffpunkteByDate,
  treffpunktGroupName,
  isTreffpunktAssignedTo,
  mondayOfWeek,
  weekDates,
  treffpunkteInWeek,
} from './congregation'
import type { GroupData, GroupItem, PersonItem, TreffpunktItem } from '../types'

function makeTreffpunkt(id: string, dates: string[], time: string, extra: Partial<TreffpunktItem['data']> = {}): TreffpunktItem {
  return {
    id,
    type: 'treffpunkt',
    data: { dates, general: false, groupId: null, time, location: '', leaderName: '', ...extra },
    createdAt: '',
    updatedAt: '',
  }
}

function makeGroup(id: string, data: Partial<GroupData>): GroupItem {
  return {
    id,
    type: 'group',
    data: { name: 'Gruppe', leaderId: null, deputyId: null, memberIds: [], ...data },
    createdAt: '',
    updatedAt: '',
  }
}

function person(id: string, firstName: string, lastName: string, hidden = false): PersonItem {
  return {
    id,
    type: 'person',
    data: { firstName, lastName, ...(hidden ? { hidden: true } : {}) },
    createdAt: '',
    updatedAt: '',
  }
}

const group: GroupItem = {
  id: 'g1',
  type: 'group',
  data: {
    name: 'Gruppe 1',
    leaderId: 'p2',
    deputyId: 'p3',
    memberIds: ['p1', 'p2', 'p3'],
  },
  createdAt: '',
  updatedAt: '',
}

describe('personName', () => {
  it('kombiniert Vor- und Nachname', () => {
    expect(personName({ firstName: 'Anna', lastName: 'Müller' })).toBe('Anna Müller')
  })

  it('liefert einen Platzhalter bei fehlendem Namen', () => {
    expect(personName({ firstName: '', lastName: '' })).toBe('–')
  })
})

describe('sortPeopleByLastName', () => {
  it('sortiert nach Nachname (deutsche Sortierung)', () => {
    const people = [
      person('1', 'Max', 'Ärger'),
      person('2', 'Anna', 'Zimmermann'),
      person('3', 'Tom', 'Berger'),
    ]
    const sorted = sortPeopleByLastName(people).map((p) => p.data.lastName)
    expect(sorted).toEqual(['Ärger', 'Berger', 'Zimmermann'])
  })

  it('sortiert bei gleichem Nachnamen nach Vorname', () => {
    const people = [person('1', 'Bernd', 'Schmidt'), person('2', 'Anna', 'Schmidt')]
    const sorted = sortPeopleByLastName(people).map((p) => p.data.firstName)
    expect(sorted).toEqual(['Anna', 'Bernd'])
  })
})

describe('visiblePeople', () => {
  it('filtert verborgene Personen heraus', () => {
    const people = [person('1', 'Anna', 'Müller'), person('2', 'Tom', 'Berger', true)]
    expect(visiblePeople(people).map((p) => p.id)).toEqual(['1'])
  })
})

describe('groupMembers / hasRoleInGroup', () => {
  const people = [
    person('p1', 'Anna', 'Zimmermann'),
    person('p2', 'Max', 'Ärger'),
    person('p3', 'Tom', 'Berger'),
  ]

  it('löst Mitglieder auf und sortiert sie nach Nachname', () => {
    const members = groupMembers(group, people)
    expect(members.map((m) => m.data.lastName)).toEqual(['Ärger', 'Berger', 'Zimmermann'])
  })

  it('erkennt Leiter und Stellvertreter als Rollen', () => {
    expect(hasRoleInGroup(group, 'p2')).toBe(true)
    expect(hasRoleInGroup(group, 'p3')).toBe(true)
    expect(hasRoleInGroup(group, 'p1')).toBe(false)
  })
})

describe('isPersonInGroup', () => {
  it('zählt Mitglied, Leiter und Stellvertreter als zugehörig', () => {
    expect(isPersonInGroup(group, 'p1')).toBe(true) // Mitglied
    expect(isPersonInGroup(group, 'p2')).toBe(true) // Leiter
    expect(isPersonInGroup(group, 'p3')).toBe(true) // Stellvertreter
    expect(isPersonInGroup(group, 'x')).toBe(false)
  })
})

describe('normalizeGroupData', () => {
  it('nimmt Leiter und Stellvertreter automatisch als Teilnehmer auf', () => {
    const normalized = normalizeGroupData({
      name: 'Gruppe A',
      leaderId: 'g-leader',
      deputyId: 'g-deputy',
      memberIds: ['g-member'],
    })
    expect(normalized.memberIds).toEqual(['g-member', 'g-leader', 'g-deputy'])
  })

  it('entfernt doppelte IDs und behandelt fehlende memberIds', () => {
    const normalized = normalizeGroupData({
      name: 'Gruppe B',
      leaderId: null,
      deputyId: 'g-deputy',
      memberIds: ['g-deputy', 'g-deputy'],
    })
    expect(normalized.memberIds).toEqual(['g-deputy'])
  })
})

describe('conflictingGroupAssignments', () => {
  const g1 = makeGroup('g1', { name: 'A', leaderId: 'p2', memberIds: ['p1', 'p2'] })

  it('erkennt Personen, die bereits in einer anderen Gruppe sind', () => {
    expect(conflictingGroupAssignments([g1], null, ['p1', 'p9'])).toEqual(['p1'])
  })

  it('ignoriert die eigene bestehende Zuordnung (bearbeitete Gruppe)', () => {
    expect(conflictingGroupAssignments([g1], 'g1', ['p1', 'p2'])).toEqual([])
  })

  it('zählt Leiter/Stellvertreter in anderen Gruppen als Konflikt', () => {
    expect(conflictingGroupAssignments([g1], null, ['p2'])).toEqual(['p2'])
  })
})

describe('sortTreffpunkteByDate', () => {
  it('sortiert nach erstem Datum, dann nach Uhrzeit', () => {
    const items = [
      makeTreffpunkt('b', ['2026-05-03'], '10:00'),
      makeTreffpunkt('a', ['2026-04-02'], '09:00'),
      makeTreffpunkt('c', ['2026-04-02'], '14:00'),
    ]
    expect(sortTreffpunkteByDate(items).map((t) => t.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('groupTreffpunkteByDate', () => {
  it('gruppiert mehrere Treffpunkte unter ihrem Datum, zuerst erster Termin', () => {
    const items = [
      makeTreffpunkt('a', ['2026-04-02'], '10:00'),
      makeTreffpunkt('b', ['2026-04-02', '2026-04-05'], '09:00'),
      makeTreffpunkt('c', ['2026-04-05'], '14:00'),
    ]
    const groups = groupTreffpunkteByDate(items)
    expect(groups.map((g) => g.date)).toEqual(['2026-04-02', '2026-04-05'])
    expect(groups[0].items.map((t) => t.id)).toEqual(['b', 'a']) // 02: b(9) vor a(10)
    expect(groups[1].items.map((t) => t.id)).toEqual(['b', 'c'])
  })
})

describe('treffpunktGroupName', () => {
  const groupItem = makeGroup('g7', { name: 'Gruppe 1' })
  const groupById = (id: string) => (id === 'g7' ? groupItem : undefined)

  it('liefert den Gruppennamen', () => {
    expect(treffpunktGroupName(makeTreffpunkt('t', ['2026-04-02'], '09:00', { groupId: 'g7' }), groupById)).toBe('Gruppe 1')
  })

  it('liefert null bei allgemeinem Treffpunkt oder fehlender Gruppe', () => {
    expect(treffpunktGroupName(makeTreffpunkt('t', ['2026-04-02'], '09:00', { general: true, groupId: 'g7' }), groupById)).toBeNull()
    expect(treffpunktGroupName(makeTreffpunkt('t', ['2026-04-02'], '09:00', { groupId: 'missing' }), groupById)).toBeNull()
  })
})

describe('isTreffpunktAssignedTo', () => {
  it('matcht allgemeine Treffpunkte immer', () => {
    expect(isTreffpunktAssignedTo(makeTreffpunkt('t', ['2026-04-02'], '09:00', { general: true }), 'Anna')).toBe(true)
  })

  it('matcht anhand des Leiter-Namens (case-insensitiv, Teilstring)', () => {
    expect(isTreffpunktAssignedTo(makeTreffpunkt('t', ['2026-04-02'], '09:00', { leaderName: 'Müller Anna' }), 'anna')).toBe(true)
    expect(isTreffpunktAssignedTo(makeTreffpunkt('t', ['2026-04-02'], '09:00', { leaderName: 'Max' }), 'Anna')).toBe(false)
  })

  it('ohne eigenen Namen nur für allgemeine Treffpunkte', () => {
    expect(isTreffpunktAssignedTo(makeTreffpunkt('t', ['2026-04-02'], '09:00', { leaderName: 'Anna' }), '')).toBe(false)
  })
})

describe('mondayOfWeek / weekDates / treffpunkteInWeek', () => {
  it('findet den Montag einer Woche (Mittwoch → Montag)', () => {
    // 2026-04-02 ist ein Donnerstag? Egal: Montag muss 2026-03-30 sein (Wochenstart Mo).
    expect(mondayOfWeek('2026-04-02')).toBe('2026-03-30')
  })

  it('liefert alle 7 Tage Mo–So', () => {
    expect(weekDates('2026-04-02')).toEqual([
      '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05',
    ])
  })

  it('filtert Treffpunkte in der betroffenen Woche', () => {
    const inWeek = makeTreffpunkt('a', ['2026-04-01', '2026-04-05'], '09:00')
    const outWeek = makeTreffpunkt('b', ['2026-04-06'], '09:00')
    expect(treffpunkteInWeek([inWeek, outWeek], '2026-04-02').map((t) => t.id)).toEqual(['a'])
  })
})
