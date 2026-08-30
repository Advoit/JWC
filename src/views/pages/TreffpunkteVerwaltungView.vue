<script setup lang="ts">
/**
 * Verwaltung → Treffpunkte: anstehende/allen Treffpunkte übersichtlich anzeigen
 * und neue anlegen/ändern/entfernen. Leiter ist optional, Gruppenname wird aus
 * den Gruppen importiert (oder „allgemeiner Treffpunkt“). Datum ist ein echter
 * Picker mit optionalem zweitem Datum; Uhrzeit ist ein HH:MM-Picker.
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../../stores/session'
import { useCongregationStore } from '../../stores/congregation'
import {
  groupTreffpunkteByDate,
  sortGroupsByName,
  treffpunktGroupName,
} from '../../services/congregation'
import AppIcon from '../../components/AppIcon.vue'
import type { TreffpunktData, TreffpunktItem } from '../../types'

const session = useSessionStore()
const congregation = useCongregationStore()
const { t } = useI18n()

const isAdmin = computed(() => session.isAdminUnlocked)

// ---- Formular ----
const editingId = ref<string | null>(null)
const formOpen = ref(false)
const error = ref('')
const formGeneral = ref(false)
const formGroupId = ref<string | null>(null)
const formDates = ref<string[]>([''])
const formTime = ref('')
const formLocation = ref('')
const formLeaderName = ref('')

const groupsSorted = computed(() => sortGroupsByName(congregation.groups))

function startNew(): void {
  editingId.value = null
  formGeneral.value = false
  formGroupId.value = null
  formDates.value = ['']
  formTime.value = ''
  formLocation.value = ''
  formLeaderName.value = ''
  error.value = ''
  formOpen.value = true
}

function startEdit(t: TreffpunktItem): void {
  editingId.value = t.id
  formGeneral.value = t.data.general
  formGroupId.value = t.data.groupId
  formDates.value = t.data.dates.length ? [...t.data.dates] : ['']
  formTime.value = t.data.time
  formLocation.value = t.data.location
  formLeaderName.value = t.data.leaderName
  error.value = ''
  formOpen.value = true
}

function title(tp: TreffpunktItem): string {
  return treffpunktGroupName(tp, (id) => congregation.groupById(id)) ?? t('treffpunkte.general')
}

function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function save(): void {
  const dates = formDates.value.map((d) => d.trim()).filter(Boolean)
  if (dates.length === 0) {
    error.value = t('treffpunkte.dateRequired')
    return
  }
  if (new Set(dates).size !== dates.length) {
    error.value = t('treffpunkte.duplicateDate')
    return
  }
  const data: TreffpunktData = {
    dates,
    general: formGeneral.value,
    groupId: formGeneral.value ? null : formGroupId.value,
    time: formTime.value,
    location: formLocation.value,
    leaderName: formLeaderName.value.trim(),
  }
  if (editingId.value) congregation.updateTreffpunkt(editingId.value, data)
  else congregation.addTreffpunkt(data)
  formOpen.value = false
}

function addDateField(): void {
  formDates.value = [...formDates.value, '']
}

function removeDateField(index: number): void {
  formDates.value = formDates.value.filter((_, i) => i !== index)
}

function remove(tp: TreffpunktItem): void {
  if (window.confirm(t('treffpunkte.removeConfirm'))) {
    congregation.removeTreffpunkt(tp.id)
  }
}
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('nav.sub.treffpunkte') }}</h1>

    <div v-if="!isAdmin" class="card">
      <p class="card-sub">{{ t('settings.adminOnlyHint') }}</p>
    </div>

    <template v-else>
      <div class="card">
        <div class="card-head">
          <h2 class="card-title">{{ t('treffpunkte.title') }}</h2>
          <button class="btn btn--ghost btn--small" @click="startNew">
            <AppIcon name="plus" :size="16" />
            <span>{{ t('treffpunkte.new') }}</span>
          </button>
        </div>

        <div v-if="formOpen" class="tp-form">
          <div class="form-row">
            <template v-if="!formGeneral">
              <div class="field">
                <label>{{ t('treffpunkte.group') }}</label>
                <select v-model="formGroupId" class="input">
                  <option :value="null">{{ t('groups.noLeader') }}</option>
                  <option v-for="g in groupsSorted" :key="g.id" :value="g.id">{{ g.data.name }}</option>
                </select>
              </div>
            </template>
            <div class="field">
              <label class="check-label">
                <input v-model="formGeneral" type="checkbox" />
                <span>{{ t('treffpunkte.general') }}</span>
              </label>
            </div>
          </div>

          <div class="field">
            <label>{{ t('treffpunkte.date') }}</label>
            <div class="date-list">
              <div v-for="(_, i) in formDates" :key="i" class="date-row">
                <input v-model="formDates[i]" type="date" class="input" />
                <button
                  v-if="formDates.length > 1"
                  class="icon-btn icon-btn--danger"
                  :title="t('treffpunkte.removeDate')"
                  @click="removeDateField(i)"
                >
                  <AppIcon name="trash" :size="16" />
                </button>
              </div>
            </div>
            <button class="btn-add-date" @click="addDateField">
              <AppIcon name="plus" :size="16" />
              <span>{{ t('treffpunkte.addDate') }}</span>
            </button>
          </div>

          <div class="form-row">
            <div class="field">
              <label>{{ t('treffpunkte.time') }}</label>
              <input v-model="formTime" type="time" class="input" />
            </div>
            <div class="field">
              <label>{{ t('treffpunkte.location') }}</label>
              <input v-model="formLocation" class="input" :placeholder="t('treffpunkte.locationPlaceholder')" />
            </div>
          </div>

          <div class="field">
            <label>{{ t('treffpunkte.leader') }} <span class="opt">({{ t('treffpunkte.optional') }})</span></label>
            <input v-model="formLeaderName" class="input" :placeholder="t('treffpunkte.leaderPlaceholder')" />
          </div>

          <div v-if="error" class="error" style="margin-bottom: 12px">{{ error }}</div>
          <div class="row">
            <button class="btn btn--primary btn--narrow" @click="save">{{ t('common.save') }}</button>
            <button class="btn btn--ghost btn--narrow" @click="formOpen = false">{{ t('common.cancel') }}</button>
          </div>
        </div>

        <p v-if="congregation.treffpunkte.length === 0 && !formOpen" class="card-sub">{{ t('treffpunkte.empty') }}</p>
        <div v-for="g in groupTreffpunkteByDate(congregation.treffpunkte)" :key="g.date" class="tp-day">
          <h3 class="tp-day-title">{{ formatDate(g.date) }}</h3>
          <ul class="tp-admin-list">
            <li v-for="tp in g.items" :key="tp.id" class="tp-admin-row">
              <span class="tp-admin-time">{{ tp.data.time }}</span>
              <div class="tp-admin-body">
                <span class="tp-admin-title">{{ title(tp) }}</span>
                <span class="tp-admin-meta" v-if="tp.data.location || tp.data.leaderName">
                  <span v-if="tp.data.location">{{ tp.data.location }}</span>
                  <span v-if="tp.data.leaderName">· {{ tp.data.leaderName }}</span>
                </span>
              </div>
              <span class="person-actions">
                <button class="icon-btn" :title="t('common.edit')" @click="startEdit(tp)">
                  <AppIcon name="pencil" :size="16" />
                </button>
                <button class="icon-btn icon-btn--danger" :title="t('common.delete')" @click="remove(tp)">
                  <AppIcon name="trash" :size="16" />
                </button>
              </span>
            </li>
          </ul>
        </div>
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

.date-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-add-date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: transparent;
  color: var(--color-accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.btn-add-date:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  padding-top: 6px;
}

.opt {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 13px;
}

.tp-day {
  margin-top: 16px;
}

.tp-day-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: 6px;
}

.tp-admin-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tp-admin-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.tp-admin-row:last-child {
  border-bottom: none;
}

.tp-admin-time {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 44px;
}

.tp-admin-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.tp-admin-title {
  font-size: 15px;
  font-weight: 600;
}

.tp-admin-meta {
  font-size: 13px;
  color: var(--color-text-muted);
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
</style>