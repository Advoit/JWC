<script setup lang="ts">
/**
 * Verwaltung (nur für Admin). Erfordert das Admin-Passwort. Nach Freischaltung
 * zeigt die Seite eine Liste der Verwaltungsbereiche – jeder Punkt öffnet eine
 * eigene Verwaltungsseite (z. B. Gruppen). Die Liste kommt aus einem zentralen
 * Array, damit neue Bereiche einfach ergänzt werden können (DRY).
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../../stores/session'
import AppIcon from '../../components/AppIcon.vue'

const session = useSessionStore()
const { t } = useI18n()

const pass = ref('')
const busy = ref(false)
const error = ref('')

/** Zentrale Liste der Verwaltungsbereiche (weitere einfach ergänzen). */
const AREAS = [
  { key: 'groups', icon: 'group', titleKey: 'nav.sub.gruppen', hintKey: 'groups.manageHint', to: '/app/einstellungen/verwaltung/gruppen' },
  { key: 'treffpunkte', icon: 'map', titleKey: 'nav.sub.treffpunkte', hintKey: 'treffpunkte.manageHint', to: '/app/einstellungen/verwaltung/treffpunkte' },
] as const

async function unlock(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    const ok = await session.unlockAdmin(pass.value)
    if (!ok) error.value = 'Falsches Admin-Passwort.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('admin.title') }}</h1>

    <div v-if="!session.isAdminUnlocked" class="card unlock">
      <h2 class="card-title">{{ t('admin.unlockTitle') }}</h2>
      <div class="field">
        <label>{{ t('landing.adminPassword') }}</label>
        <input v-model="pass" type="password" class="input" @keyup.enter="unlock" />
      </div>
      <button class="btn btn--primary btn--block" :disabled="busy" @click="unlock">
        {{ t('admin.loginButton') }}
      </button>
      <div v-if="error" class="error" style="margin-top: 12px">{{ error }}</div>
    </div>

    <div v-else class="areas">
      <router-link
        v-for="area in AREAS"
        :key="area.key"
        :to="area.to"
        class="card area-card"
      >
        <span class="area-icon"><AppIcon :name="area.icon" :size="22" /></span>
        <span class="area-body">
          <span class="area-title">{{ t(area.titleKey) }}</span>
          <span class="area-hint">{{ t(area.hintKey) }}</span>
        </span>
        <span class="area-chevron"><AppIcon name="chevron" :size="18" /></span>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}

.unlock {
  max-width: 420px;
}

.area-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  color: var(--color-text);
  text-decoration: none;
  transition: border-color 0.15s, transform 0.1s;
}

.area-card:active {
  transform: scale(0.99);
}

.area-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  flex-shrink: 0;
}

.area-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.area-title {
  font-size: 16px;
  font-weight: 600;
}

.area-hint {
  font-size: 13px;
  color: var(--color-text-muted);
}

.area-chevron {
  margin-left: auto;
  color: var(--color-text-muted);
  transform: rotate(-90deg);
}
</style>
