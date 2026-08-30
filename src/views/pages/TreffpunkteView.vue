<script setup lang="ts">
/**
 * Treffpunkte (öffentlich): zeigt die anstehenden Treffpunkte chronologisch
 * gruppiert nach Datum. Vergangene Treffpunkte (vor heute) werden ausgeblendet;
 * an einem Tag mit mehreren Treffpunkten stehen alle unter demselben Datum.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCongregationStore } from '../../stores/congregation'
import { groupTreffpunkteByDate, treffpunktGroupName } from '../../services/congregation'
import AppIcon from '../../components/AppIcon.vue'
import type { TreffpunktItem } from '../../types'

const congregation = useCongregationStore()
const { t } = useI18n()

/** Heute als lokales Datum (YYYY-MM-DD), damit der Vergleich ISO-stabil ist. */
function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Nur anstehende Treffpunkte (mindestens ein Datum liegt heute oder später). */
const upcoming = computed(() => {
  const today = todayISO()
  return congregation.treffpunkte.filter((t) => t.data.dates.some((d) => d >= today))
})

/** Nach Datum gruppiert (aufsteigend). */
const grouped = computed(() => groupTreffpunkteByDate(upcoming.value))

/** Kennung/Bezeichnung eines Treffpunkts für die Anzeige. */
function title(tp: TreffpunktItem): string {
  return treffpunktGroupName(tp, (id) => congregation.groupById(id)) ?? t('treffpunkte.general')
}

/** „Sa, 05. Apr 2026“ für die Anzeige. */
function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('nav.sub.treffpunkte') }}</h1>

    <p v-if="grouped.length === 0" class="card-sub">{{ t('treffpunkte.emptyUpcoming') }}</p>

    <div v-for="g in grouped" :key="g.date" class="card group-card">
      <h2 class="date-title">{{ formatDate(g.date) }}</h2>
      <ul class="tp-list">
        <li v-for="tp in g.items" :key="tp.id" class="tp-row">
          <span class="tp-time">{{ tp.data.time }}</span>
          <div class="tp-body">
            <span class="tp-title">{{ title(tp) }}</span>
            <span class="tp-meta">
              <template v-if="tp.data.location">
                <AppIcon name="map" :size="14" />
                <span>{{ tp.data.location }}</span>
              </template>
              <template v-if="tp.data.leaderName">
                <AppIcon name="user" :size="14" />
                <span>{{ tp.data.leaderName }}</span>
              </template>
            </span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}

.group-card {
  padding: 18px 20px;
  margin-bottom: 14px;
}

.date-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--color-accent);
}

.tp-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tp-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.tp-row:last-child {
  border-bottom: none;
}

.tp-time {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
  flex-shrink: 0;
  min-width: 44px;
}

.tp-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tp-title {
  font-size: 15px;
  font-weight: 600;
}

.tp-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.tp-meta svg {
  flex-shrink: 0;
}
</style>