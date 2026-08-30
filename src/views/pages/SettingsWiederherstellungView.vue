<script setup lang="ts">
/**
 * Einstellungen → Wiederherstellung (nur für Admin-Sitzungen): stellt eine
 * zuvor erstellte, verschlüsselte Sicherung wieder her.
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../../stores/session'
import { useCongregationStore } from '../../stores/congregation'
import { useErrorText } from '../../composables/useErrorText'
import { verifyAndDecryptBackup } from '../../services/backup'
import { storage } from '../../services/storage'
import AppIcon from '../../components/AppIcon.vue'

const session = useSessionStore()
const congregation = useCongregationStore()
const { t } = useI18n()
const errorText = useErrorText()

const backupPass = ref('')
const restoring = ref(false)
const backupMsg = ref('')
const backupError = ref('')

const isAdmin = computed(() => session.isAdminUnlocked)

async function importBackup(event: Event): Promise<void> {
  backupError.value = ''
  backupMsg.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!backupPass.value) {
    backupError.value = 'Bitte das Admin-Passwort der Sicherung eingeben.'
    input.value = ''
    return
  }
  restoring.value = true
  try {
    const text = await file.text()
    const data = await verifyAndDecryptBackup(text, backupPass.value)
    const imported = {
      ...data.congregation,
      updatedAt: new Date().toISOString(),
    }
    session.congregation = imported
    storage.setCongregation(imported)
    congregation.applyItems(data.items ?? [])
    backupMsg.value = t('settings.importSuccess')
  } catch (e) {
    backupError.value = errorText(e) || t('settings.importError')
  } finally {
    restoring.value = false
    input.value = ''
  }
}
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('settings.wiederherstellung') }}</h1>

    <div v-if="!isAdmin" class="card">
      <p class="card-sub">{{ t('settings.adminOnlyHint') }}</p>
    </div>

    <div v-else class="card">
      <h2 class="card-title">{{ t('settings.wiederherstellung') }}</h2>
      <p class="card-sub" style="margin-bottom: 12px">{{ t('settings.importHint') }}</p>

      <div class="field">
        <label>{{ t('landing.adminPassword') }}</label>
        <input v-model="backupPass" type="password" class="input" />
      </div>

      <label class="btn btn--ghost btn--narrow upload">
        <AppIcon name="upload" :size="16" />
        <span>{{ t('settings.importButton') }}</span>
        <input type="file" accept=".json,application/json" :disabled="restoring" @change="importBackup" />
      </label>

      <div v-if="backupMsg" class="notice" style="margin-top: 12px">{{ backupMsg }}</div>
      <div v-if="backupError" class="error" style="margin-top: 12px">{{ backupError }}</div>
    </div>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}

.btn--narrow {
  width: auto;
  padding: 10px 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.upload input {
  display: none;
}
</style>