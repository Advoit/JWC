<script setup lang="ts">
/**
 * Einstellungen → Profil: lokaler Vorname (nur auf diesem Gerät gespeichert).
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../../stores/session'

const session = useSessionStore()
const { t } = useI18n()

const nameInput = ref(session.firstName)
const nameSaved = ref(false)

function saveName(): void {
  session.setFirstName(nameInput.value)
  nameSaved.value = true
  setTimeout(() => (nameSaved.value = false), 2000)
}

function removeName(): void {
  session.clearFirstName()
  nameInput.value = ''
  nameSaved.value = true
  setTimeout(() => (nameSaved.value = false), 2000)
}
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('settings.profile') }}</h1>

    <div class="card">
      <h2 class="card-title">{{ t('settings.profile') }}</h2>
      <p class="card-sub" style="margin-bottom: 12px">{{ t('settings.yourNameHint') }}</p>
      <div class="row">
        <input v-model="nameInput" class="input" :placeholder="'Hallo!'" />
        <button class="btn btn--secondary btn--narrow" @click="saveName">{{ t('common.save') }}</button>
      </div>
      <div class="row" style="margin-top: 8px">
        <button class="btn btn--ghost btn--narrow" @click="removeName">{{ t('settings.removeName') }}</button>
        <span v-if="nameSaved" class="saved">{{ t('settings.nameSaved') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.btn--narrow {
  width: auto;
  padding: 10px 16px;
}

.saved {
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 500;
}
</style>