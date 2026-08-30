<script setup lang="ts">
/**
 * Dashboard nach Login: Begrüßung (mit lokalem Namen), Hinweise, "Meine Aufgaben"
 * und die Wochenübersicht. Daten kommen später aus dem Store; heute werden die
 * Sektionen mit statischen Beispielen und Placeholdern befüllt.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../stores/session'
import { useCongregationStore } from '../stores/congregation'
import {
  groupTreffpunkteByDate,
  isTreffpunktAssignedTo,
  treffpunkteInWeek,
  treffpunktGroupName,
} from '../services/congregation'
import AppIcon from '../components/AppIcon.vue'
import type { TreffpunktItem } from '../types'

const router = useRouter()
const session = useSessionStore()
const congregation = useCongregationStore()
const { t } = useI18n()

const name = computed(() => session.firstName)
const greeting = computed(() =>
  name.value ? t('dashboard.hello', { name: name.value }) : t('dashboard.helloDefault')
)

const notices = ref<{ id: number; text: string }[]>([
  { id: 1, text: 'Willkommen! Dies ist ein Platzhalter-Hinweis.' },
])

/** Heute als ISO-Datum (YYYY-MM-DD). */
function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** „Fr, 05.04.“ für die Anzeige. */
function formatDay(date: string, long = false): string {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString('de-DE', long ? { weekday: 'long' } : { weekday: 'short', day: '2-digit', month: '2-digit' })
}

/** Kennung/Bezeichnung eines Treffpunkts (Gruppenname oder „Allgemein“). */
function titleOf(tp: TreffpunktItem): string {
  return treffpunktGroupName(tp, (id) => congregation.groupById(id)) ?? t('treffpunkte.general')
}

/** „Meine Aufgaben“: Treffpunkte, die allgemein sind oder auf meinen Namen passen (nur zukünftig). */
const myTasks = computed(() => {
  if (!name.value) return []
  const today = todayISO()
  const mine: { id: string; day: string; section: string; label: string; time?: string }[] = []
  for (const tp of congregation.treffpunkte) {
    if (!isTreffpunktAssignedTo(tp, name.value)) continue
    for (const date of [...tp.data.dates].filter((d) => d >= today).sort()) {
      mine.push({
        id: `${tp.id}-${date}`,
        day: formatDay(date),
        section: t('nav.sub.treffpunkte'),
        label: titleOf(tp),
        time: tp.data.time,
      })
    }
  }
  return mine
})

/** Wochenübersicht: Treffpunkte, die in dieser Woche (Mo–So) anstehen. */
const week = computed(() => {
  const today = todayISO()
  const inWeek = treffpunkteInWeek(congregation.treffpunkte, today)
  const items: { id: string; day: string; text: string; time?: string }[] = []
  for (const g of groupTreffpunkteByDate(inWeek)) {
    for (const tp of g.items) {
      items.push({
        id: `${tp.id}-${g.date}`,
        day: formatDay(g.date, true),
        text: titleOf(tp),
        time: tp.data.time,
      })
    }
  }
  return items
})

function openNameSettings(): void {
  router.push({ name: 'settingsProfil' })
}
</script>

<template>
  <section class="page">
    <header class="dash-head">
      <h1 class="dash-greet">{{ greeting }}</h1>
      <button class="name-btn" @click="openNameSettings">
        <AppIcon name="user" :size="16" />
        <span v-if="name">{{ name }}</span>
        <span v-else>{{ t('dashboard.setYourName') }}</span>
      </button>
    </header>

    <!-- Hinweise -->
    <div class="card dash-block">
      <h2 class="card-title dash-title">
        <AppIcon name="notes" :size="18" />
        <span>{{ t('dashboard.sections.notices') }}</span>
      </h2>
      <p v-if="notices.length === 0" class="card-sub">{{ t('dashboard.noticesEmpty') }}</p>
      <ul v-else class="dash-list">
        <li v-for="n in notices" :key="n.id" class="dash-item">{{ n.text }}</li>
      </ul>
    </div>

    <!-- Meine Aufgaben -->
    <div class="card dash-block">
      <h2 class="card-title">{{ t('dashboard.sections.myTasks') }}</h2>
      <p v-if="!name" class="notice">{{ t('dashboard.myTasksEmpty') }}</p>
      <template v-else>
        <p
          v-if="myTasks.length === 0"
          class="card-sub"
        >{{ t('dashboard.myTasksEmpty') }}</p>
        <ul v-else class="dash-list my-tasks">
          <li v-for="task in myTasks" :key="task.id" class="task-row">
            <span class="task-day">{{ task.day }}</span>
            <span class="task-body">
              <span class="task-label">{{ task.label }}</span>
              <span class="task-sec">{{ task.section }}<template v-if="task.time"> · {{ task.time }}</template></span>
            </span>
          </li>
        </ul>
      </template>
    </div>

    <!-- Wochenübersicht -->
    <div class="card dash-block">
      <h2 class="card-title dash-title">
        <AppIcon name="calendar" :size="18" />
        <span>{{ t('dashboard.sections.weekOverview') }}</span>
      </h2>
      <p v-if="week.length === 0" class="card-sub">{{ t('dashboard.weekEmpty') }}</p>
      <ul v-else class="dash-list week-list">
        <li v-for="w in week" :key="w.id" class="week-row">
          <span class="week-day">{{ w.day }}</span>
          <span class="week-text">{{ w.text }}</span>
          <span v-if="w.time" class="week-time">{{ w.time }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.dash-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.dash-greet {
  font-size: 26px;
}

.name-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
}

.dash-block + .dash-block {
  margin-top: 16px;
}

.dash-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dash-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}

.dash-item {
  padding: 8px 0;
  font-size: 15px;
  border-bottom: 1px solid var(--color-border);
}
.dash-item:last-child {
  border-bottom: none;
}

/* Meine Aufgaben */
.my-tasks {
  margin: 0;
}

.task-row {
  display: flex;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}
.task-row:last-child {
  border-bottom: none;
}

.task-day {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 14px;
  padding-top: 2px;
  min-width: 76px;
}

.task-body {
  display: flex;
  flex-direction: column;
}

.task-label {
  font-size: 15px;
  font-weight: 500;
}

.task-sec {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* Wochenübersicht */
.week-list {
  margin: 0;
}

.week-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}
.week-row:last-child {
  border-bottom: none;
}

.week-day {
  font-weight: 600;
  font-size: 14px;
  min-width: 84px;
}

.week-text {
  flex: 1;
  font-size: 15px;
}

.week-time {
  color: var(--color-text-muted);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
</style>