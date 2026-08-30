<script setup lang="ts">
/**
 * Allgemeine Platzhalter-Seite. Alle noch ungefüllten Bereiche nutzen diese
 * Komponente – ein Aufbau, eine Darstellung (DRY). Der Pass-through-Text und
 * die Zeichenfläche werden über Props gesteuert.
 */
import AppIcon from './AppIcon.vue'
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    title: string
    icon?: string
    note?: string
  }>(),
  { icon: 'checklist', note: '' }
)

const { t } = useI18n()
</script>

<template>
  <section class="page">
    <header class="ph-head">
      <span class="ph-icon"><AppIcon :name="icon" :size="24" /></span>
      <div>
        <h1 class="ph-title">{{ title }}</h1>
        <p class="ph-crumb"><router-link :to="{ name: 'dashboard' }">{{ t('page.backDashboard') }}</router-link></p>
      </div>
    </header>

    <div class="card ph-card">
      <AppIcon :name="icon" :size="40" class="ph-big" />
      <h2 class="ph-coming">{{ t('common.comingSoon') }}</h2>
      <p class="ph-note" v-if="note">{{ note }}</p>
      <p class="ph-hint">{{ t('common.placeholder') }}</p>
    </div>
  </section>
</template>

<style scoped>
.ph-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.ph-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.ph-title {
  font-size: 24px;
}

.ph-crumb {
  font-size: 13px;
  color: var(--color-text-muted);
}

.ph-card {
  text-align: center;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.ph-big {
  color: var(--color-accent);
  opacity: 0.6;
}

.ph-coming {
  font-size: 20px;
}

.ph-note {
  font-size: 14px;
  color: var(--color-text);
}

.ph-hint {
  font-size: 14px;
  color: var(--color-text-muted);
}
</style>