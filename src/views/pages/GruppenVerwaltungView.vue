<script setup lang="ts">
/**
 * Verwaltung → Gruppen: Gruppen erstellen/bearbeiten, Rollen vergeben
 * (Leiter = dunkler Akzent, Stellvertreter = heller Akzent) und Personen
 * anlegen, bearbeiten, verbergen oder entfernen.
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../../stores/session'
import { useCongregationStore } from '../../stores/congregation'
import {
  personName,
  sortPeopleByLastName,
  sortGroupsByName,
  conflictingGroupAssignments,
} from '../../services/congregation'
import AppIcon from '../../components/AppIcon.vue'
import type { GroupItem, PersonItem } from '../../types'

const session = useSessionStore()
const congregation = useCongregationStore()
const { t } = useI18n()

const isAdmin = computed(() => session.isAdminUnlocked)

// ---- Personen ----
const personFirst = ref('')
const personLast = ref('')
const editingPersonId = ref<string | null>(null)
const personError = ref('')
const personFormOpen = ref(false)

const peopleSorted = computed(() => sortPeopleByLastName(congregation.people))

function startNewPerson(): void {
  editingPersonId.value = null
  personFirst.value = ''
  personLast.value = ''
  personError.value = ''
  personFormOpen.value = true
}

function startEditPerson(p: PersonItem): void {
  editingPersonId.value = p.id
  personFirst.value = p.data.firstName
  personLast.value = p.data.lastName
  personError.value = ''
  personFormOpen.value = true
}

function savePerson(): void {
  if (!personFirst.value.trim() && !personLast.value.trim()) {
    personError.value = t('groups.nameRequired')
    return
  }
  const data = {
    firstName: personFirst.value.trim(),
    lastName: personLast.value.trim(),
  }
  if (editingPersonId.value) {
    congregation.updatePerson(editingPersonId.value, data)
  } else {
    congregation.addPerson(data)
  }
  personFormOpen.value = false
}

function toggleHidden(p: PersonItem): void {
  congregation.updatePerson(p.id, { hidden: !p.data.hidden })
}

function removePerson(p: PersonItem): void {
  if (window.confirm(t('groups.removePersonConfirm', { name: personName(p.data) }))) {
    congregation.removePerson(p.id)
  }
}

// ---- Gruppen ----
const groupName = ref('')
const groupLeaderId = ref<string | null>(null)
const groupDeputyId = ref<string | null>(null)
const groupMemberIds = ref<string[]>([])
const editingGroupId = ref<string | null>(null)
const groupError = ref('')
const groupFormOpen = ref(false)

const groupsSorted = computed(() => sortGroupsByName(congregation.groups))
/** Auswahl: alle sichtbaren Personen, nach Nachname sortiert. */
const selectablePeople = computed(() => sortPeopleByLastName(congregation.people.filter((p) => !p.data.hidden)))

function startNewGroup(): void {
  editingGroupId.value = null
  groupName.value = ''
  groupLeaderId.value = null
  groupDeputyId.value = null
  groupMemberIds.value = []
  groupError.value = ''
  groupFormOpen.value = true
}

function startEditGroup(g: GroupItem): void {
  editingGroupId.value = g.id
  groupName.value = g.data.name
  groupLeaderId.value = g.data.leaderId
  groupDeputyId.value = g.data.deputyId
  groupMemberIds.value = [...g.data.memberIds]
  groupError.value = ''
  groupFormOpen.value = true
}

function toggleMember(id: string): void {
  groupMemberIds.value = groupMemberIds.value.includes(id)
    ? groupMemberIds.value.filter((m) => m !== id)
    : [...groupMemberIds.value, id]
}

function saveGroup(): void {
  if (!groupName.value.trim()) {
    groupError.value = t('groups.nameRequired')
    return
  }
  if (groupLeaderId.value && groupLeaderId.value === groupDeputyId.value) {
    groupError.value = t('groups.sameLeaderAndDeputy')
    return
  }
  // Eine Person darf nur in einer Gruppe zugeordnet sein → doppelte Vergabe prüfen.
  const assigned = new Set([
    ...(groupLeaderId.value ? [groupLeaderId.value] : []),
    ...(groupDeputyId.value ? [groupDeputyId.value] : []),
    ...groupMemberIds.value,
  ])
  const conflicted = conflictingGroupAssignments(
    congregation.groups,
    editingGroupId.value,
    [...assigned]
  )
  if (conflicted.length > 0) {
    const names = conflicted
      .map((id) => congregation.personById(id)?.data ?? null)
      .filter(Boolean)
      .map((p) => personName(p!))
    groupError.value = t('groups.personAlreadyAssigned', { names: names.join(', ') })
    return
  }
  const data = {
    name: groupName.value.trim(),
    leaderId: groupLeaderId.value,
    deputyId: groupDeputyId.value,
    memberIds: [...assigned],
  }
  if (editingGroupId.value) {
    congregation.updateGroup(editingGroupId.value, data)
  } else {
    congregation.addGroup(data)
  }
  groupFormOpen.value = false
}

function removeGroup(g: GroupItem): void {
  if (window.confirm(t('groups.removeGroupConfirm', { name: g.data.name }))) {
    congregation.removeGroup(g.id)
  }
}

</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('nav.sub.gruppen') }}</h1>

    <div v-if="!isAdmin" class="card">
      <p class="card-sub">{{ t('settings.adminOnlyHint') }}</p>
    </div>

    <template v-else>
      <!-- ================= Personen ================= -->
      <div class="card">
        <div class="card-head">
          <h2 class="card-title">{{ t('groups.people') }}</h2>
          <button class="btn btn--ghost btn--small" @click="startNewPerson">
            <AppIcon name="plus" :size="16" />
            <span>{{ t('groups.newPerson') }}</span>
          </button>
        </div>

        <div v-if="personFormOpen" class="person-form">
          <div class="form-row">
            <div class="field">
              <label>{{ t('groups.firstName') }}</label>
              <input v-model="personFirst" class="input" :placeholder="t('groups.firstName')" />
            </div>
            <div class="field">
              <label>{{ t('groups.lastName') }}</label>
              <input v-model="personLast" class="input" :placeholder="t('groups.lastName')" />
            </div>
          </div>
          <div v-if="personError" class="error" style="margin-bottom: 12px">{{ personError }}</div>
          <div class="row">
            <button class="btn btn--primary btn--narrow" @click="savePerson">{{ t('common.save') }}</button>
            <button class="btn btn--ghost btn--narrow" @click="personFormOpen = false">{{ t('common.cancel') }}</button>
          </div>
        </div>

        <p v-if="peopleSorted.length === 0 && !personFormOpen" class="card-sub">{{ t('groups.noPeople') }}</p>
        <ul v-else class="people-list">
          <li v-for="p in peopleSorted" :key="p.id" class="person-row" :class="{ 'is-hidden': p.data.hidden }">
            <span class="person-name">{{ personName(p.data) }}</span>
            <span v-if="p.data.hidden" class="badge badge--muted">{{ t('groups.hidden') }}</span>
            <span class="person-actions">
              <button class="icon-btn" :title="t('common.edit')" @click="startEditPerson(p)">
                <AppIcon name="pencil" :size="16" />
              </button>
              <button class="icon-btn" :title="p.data.hidden ? t('groups.show') : t('groups.hide')" @click="toggleHidden(p)">
                <AppIcon :name="p.data.hidden ? 'eye' : 'eye-off'" :size="16" />
              </button>
              <button class="icon-btn icon-btn--danger" :title="t('common.delete')" @click="removePerson(p)">
                <AppIcon name="trash" :size="16" />
              </button>
            </span>
          </li>
        </ul>
      </div>

      <!-- ================= Gruppen ================= -->
      <div class="card">
        <div class="card-head">
          <h2 class="card-title">{{ t('groups.title') }}</h2>
          <button class="btn btn--ghost btn--small" @click="startNewGroup">
            <AppIcon name="plus" :size="16" />
            <span>{{ t('groups.newGroup') }}</span>
          </button>
        </div>

        <div v-if="groupFormOpen" class="group-form">
          <div class="field">
            <label>{{ t('groups.groupName') }}</label>
            <input v-model="groupName" class="input" :placeholder="t('groups.groupNamePlaceholder')" />
          </div>

          <div class="form-row">
            <div class="field">
              <label>{{ t('groups.leader') }}</label>
              <select v-model="groupLeaderId" class="input">
                <option :value="null">{{ t('groups.noLeader') }}</option>
                <option v-for="p in selectablePeople" :key="p.id" :value="p.id">{{ personName(p.data) }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('groups.deputy') }}</label>
              <select v-model="groupDeputyId" class="input">
                <option :value="null">{{ t('groups.noDeputy') }}</option>
                <option v-for="p in selectablePeople" :key="p.id" :value="p.id">{{ personName(p.data) }}</option>
              </select>
            </div>
          </div>

          <p class="hint">{{ t('groups.leaderIsMemberHint') }}</p>

          <div class="field">
            <label>{{ t('groups.members') }}</label>
            <div class="member-picker">
              <label v-for="p in selectablePeople" :key="p.id" class="member-chip">
                <input
                  type="checkbox"
                  :checked="groupMemberIds.includes(p.id)"
                  @change="toggleMember(p.id)"
                />
                <span>{{ personName(p.data) }}</span>
              </label>
              <p v-if="selectablePeople.length === 0" class="card-sub">{{ t('groups.noPeopleHint') }}</p>
            </div>
          </div>

          <div v-if="groupError" class="error" style="margin-bottom: 12px">{{ groupError }}</div>
          <div class="row">
            <button class="btn btn--primary btn--narrow" @click="saveGroup">{{ t('common.save') }}</button>
            <button class="btn btn--ghost btn--narrow" @click="groupFormOpen = false">{{ t('common.cancel') }}</button>
          </div>
        </div>

        <p v-if="groupsSorted.length === 0 && !groupFormOpen" class="card-sub">{{ t('groups.empty') }}</p>
        <ul v-else class="group-list">
          <li v-for="g in groupsSorted" :key="g.id" class="group-row">
            <div class="group-row-main">
              <span class="group-name">{{ g.data.name }}</span>
              <span class="group-meta">
                <template v-if="g.data.leaderId">
                  <span class="badge badge--leader">{{ t('groups.leader') }}: {{ personName(congregation.personById(g.data.leaderId)?.data ?? { firstName: '', lastName: '' }) }}</span>
                </template>
                <template v-if="g.data.deputyId">
                  <span class="badge badge--deputy">{{ t('groups.deputy') }}: {{ personName(congregation.personById(g.data.deputyId)?.data ?? { firstName: '', lastName: '' }) }}</span>
                </template>
                <span class="group-count">{{ g.data.memberIds.length }} {{ t('groups.members') }}</span>
              </span>
            </div>
            <span class="person-actions">
              <button class="icon-btn" :title="t('common.edit')" @click="startEditGroup(g)">
                <AppIcon name="pencil" :size="16" />
              </button>
              <button class="icon-btn icon-btn--danger" :title="t('common.delete')" @click="removeGroup(g)">
                <AppIcon name="trash" :size="16" />
              </button>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.btn--small {
  width: auto;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.btn--narrow {
  width: auto;
  padding: 10px 16px;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* ---- Personen ---- */
.people-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.person-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.person-row:last-child {
  border-bottom: none;
}

.person-row.is-hidden .person-name {
  opacity: 0.45;
  text-decoration: line-through;
}

.person-name {
  font-size: 15px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
}

.person-actions {
  display: inline-flex;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.icon-btn--danger:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.badge--leader {
  background: var(--role-leader-bg);
  color: var(--role-leader-fg);
}

.badge--deputy {
  background: var(--role-deputy-bg);
  color: var(--role-deputy-fg);
}

.badge--muted {
  background: var(--color-border);
  color: var(--color-text-muted);
}

/* ---- Gruppen ---- */
.group-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.group-row:last-child {
  border-bottom: none;
}

.group-row-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.group-count {
  font-size: 13px;
  color: var(--color-text-muted);
}

.hint {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 0 0 12px;
}

/* ---- Formular: Mitgliederauswahl ---- */
.member-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.member-chip input {
  accent-color: var(--color-accent);
}

.member-chip:has(input:checked) {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
</style>
