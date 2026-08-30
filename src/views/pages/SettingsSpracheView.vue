<script setup lang="ts">
/**
 * Einstellungen → Sprache & Darstellung: Sprache (aktuell nur Deutsch) und
 * das Design (System/Hell/Dunkel) für die gesamte App.
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme'

const { t } = useI18n()
const theme = useTheme()

const language = ref('de') // Nur Deutsch verfügbar (i18n-Struktur vorhanden).
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('settings.languageAppearance') }}</h1>

    <div class="card">
      <h2 class="card-title">{{ t('settings.language') }}</h2>
      <p class="card-sub" style="margin-bottom: 12px">{{ t('settings.languageHint') }}</p>
      <select v-model="language" class="input" disabled>
        <option value="de">Deutsch</option>
      </select>
    </div>

    <div class="card">
      <h2 class="card-title">{{ t('settings.appearance') }}</h2>
      <p class="card-sub" style="margin-bottom: 12px">{{ t('settings.appearanceHint') }}</p>
      <select
        :value="theme.mode.value"
        class="input"
        @change="theme.setMode(($event.target as HTMLSelectElement).value as 'system' | 'light' | 'dark')"
      >
        <option value="system">{{ t('settings.themeSystem') }}</option>
        <option value="light">{{ t('settings.themeLight') }}</option>
        <option value="dark">{{ t('settings.themeDark') }}</option>
      </select>
    </div>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}
</style>