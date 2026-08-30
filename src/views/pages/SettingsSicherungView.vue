<script setup lang="ts">
/**
 * Einstellungen → Sicherung (nur für Admin-Sitzungen): verschlüsselter
 * Backup-Download und optionale Nextcloud-Live-Sync-Kopplung.
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../../stores/session'
import { useCongregationStore } from '../../stores/congregation'
import { useSyncStore } from '../../stores/sync'
import { useErrorText } from '../../composables/useErrorText'
import { createBackup } from '../../services/backup'
import { testConnection } from '../../services/nextcloud'
import AppIcon from '../../components/AppIcon.vue'

const session = useSessionStore()
const congregation = useCongregationStore()
const sync = useSyncStore()
const { t } = useI18n()
const errorText = useErrorText()

const backupPass = ref('')
const backupMsg = ref('')
const backupError = ref('')

// Nextcloud-Kopplung
const ncUrl = ref('')
const ncUser = ref('')
const ncPass = ref('')
const ncWorking = ref(false)
const ncMsg = ref('')
const ncError = ref('')
const testMsg = ref('')
const testOk = ref(false)

const hasNextcloud = computed(() => !!session.congregation?.nextcloud?.url)
const lastSync = computed(() => sync.lastSyncAt)
const isAdmin = computed(() => session.isAdminUnlocked)

async function exportBackup(): Promise<void> {
  backupError.value = ''
  if (!session.congregation) return
  if (!backupPass.value) {
    backupError.value = 'Bitte Admin-Passwort für die Verschlüsselung eingeben.'
    return
  }
  const json = await createBackup(session.congregation, congregation.items, backupPass.value)
  const blob = new Blob([json], { type: 'application/json' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = `jwc-backup-${session.congregation.id}.json`
  a.click()
  URL.revokeObjectURL(href)
  backupMsg.value = 'Sicherung erstellt.'
}

async function testNextcloud(): Promise<void> {
  ncError.value = ''
  ncMsg.value = ''
  testMsg.value = ''
  if (!ncUrl.value.trim() || !ncUser.value.trim() || !ncPass.value) {
    testMsg.value = t('settings.nextcloudFieldsRequired')
    testOk.value = false
    return
  }
  ncWorking.value = true
  try {
    await testConnection({ url: ncUrl.value.trim(), user: ncUser.value.trim() }, ncPass.value)
    testMsg.value = t('settings.nextcloudTestOk')
    testOk.value = true
  } catch (e) {
    testMsg.value = '✗ ' + (errorText(e) || t('settings.nextcloudTestError'))
    testOk.value = false
  } finally {
    ncWorking.value = false
  }
}

async function linkNextcloud(): Promise<void> {
  ncError.value = ''
  ncMsg.value = ''
  testMsg.value = ''
  if (!ncUrl.value.trim() || !ncUser.value.trim() || !ncPass.value) {
    ncError.value = t('settings.nextcloudFieldsRequired')
    return
  }
  ncWorking.value = true
  try {
    await sync.link(
      { url: ncUrl.value.trim(), user: ncUser.value.trim() },
      ncPass.value
    )
    try {
      await sync.syncNow()
      // Verknüpfung gespeichert; erster Sync erfolgreich.
      if (hasNextcloud.value) {
        ncMsg.value = t('settings.nextcloudLinked')
      }
    } catch (e) {
      // Verknüpfung bleibt erhalten, aber der Sync schlägt fehl → echten Grund anzeigen.
      ncError.value = `⚠ ${errorText(e)}`
    }
    ncPass.value = ''
  } catch (e) {
    ncError.value = errorText(e) || t('settings.nextcloudLinkError')
  } finally {
    ncWorking.value = false
  }
}

async function unlinkNextcloud(): Promise<void> {
  ncError.value = ''
  ncMsg.value = ''
  if (!window.confirm(t('settings.nextcloudUnlinkConfirm'))) return
  ncWorking.value = true
  try {
    await sync.unlink()
    ncMsg.value = t('settings.nextcloudUnlinked')
  } finally {
    ncWorking.value = false
  }
}

async function syncNow(): Promise<void> {
  ncError.value = ''
  ncMsg.value = ''
  ncWorking.value = true
  try {
    await sync.syncNow()
    ncMsg.value = t('settings.nextcloudSyncDone')
  } catch (e) {
    ncError.value = errorText(e)
  } finally {
    ncWorking.value = false
  }
}
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('settings.sicherung') }}</h1>

    <div v-if="!isAdmin" class="card">
      <p class="card-sub">{{ t('settings.adminOnlyHint') }}</p>
    </div>

    <template v-else>
      <div class="card">
        <h2 class="card-title card-title--icon">
          <AppIcon name="download" :size="18" />
          <span>{{ t('settings.sicherung') }}</span>
        </h2>
        <p class="card-sub" style="margin-bottom: 12px">{{ t('settings.exportHint') }}</p>

        <div class="field">
          <label>{{ t('landing.adminPassword') }}</label>
          <input v-model="backupPass" type="password" class="input" />
        </div>

        <div class="row">
          <button class="btn btn--secondary btn--narrow" @click="exportBackup">
            <AppIcon name="download" :size="16" />
            <span>{{ t('settings.exportButton') }}</span>
          </button>
        </div>
        <div v-if="backupMsg" class="notice" style="margin-top: 12px">{{ backupMsg }}</div>
        <div v-if="backupError" class="error" style="margin-top: 12px">{{ backupError }}</div>
      </div>

      <div class="card">
        <h2 class="card-title card-title--icon">
          <AppIcon name="cloud" :size="18" />
          <span>{{ t('settings.nextcloudTitle') }}</span>
        </h2>
        <p class="card-sub" style="margin-bottom: 8px">
          {{ hasNextcloud ? t('settings.nextcloudConfigured') : t('settings.nextcloudNotConfigured') }}
        </p>

        <template v-if="hasNextcloud">
          <p class="hint" style="margin-bottom: 12px">
            {{ t('settings.nextcloudUser') }}: <strong>{{ session.congregation?.nextcloud?.user }}</strong>
            <template v-if="lastSync"> · {{ t('settings.nextcloudLastSync') }}: {{ lastSync }}</template>
          </p>
          <div class="row">
            <button class="btn btn--secondary btn--narrow" :disabled="ncWorking" @click="syncNow">
              {{ t('settings.nextcloudSync') }}
            </button>
            <button class="btn btn--ghost btn--narrow" :disabled="ncWorking" @click="unlinkNextcloud">
              {{ t('settings.nextcloudUnlink') }}
            </button>
          </div>
        </template>
        <template v-else>
          <div class="field">
            <label>{{ t('landing.nextcloudUrl') }}</label>
            <input v-model="ncUrl" class="input" :placeholder="'https://cloud.example.org'" />
          </div>
          <div class="field">
            <label>{{ t('landing.nextcloudUser') }}</label>
            <input v-model="ncUser" class="input" autocomplete="username" />
          </div>
          <div class="field">
            <label>{{ t('landing.nextcloudPass') }}</label>
            <input v-model="ncPass" type="password" class="input" autocomplete="new-password" />
          </div>
          <div class="row">
            <button class="btn btn--ghost btn--narrow" :disabled="ncWorking" @click="testNextcloud">
              <AppIcon name="cloud" :size="16" />
              <span>{{ t('settings.nextcloudTest') }}</span>
            </button>
            <button class="btn btn--secondary btn--narrow" :disabled="ncWorking" @click="linkNextcloud">
              {{ t('settings.nextcloudLink') }}
            </button>
          </div>
          <div
            v-if="testMsg"
            class="notice nc-test"
            :class="{ 'nc-test--err': !testOk }"
            style="margin-top: 10px"
          >
            {{ testMsg }}
          </div>
          <p class="hint" style="margin-top: 8px">{{ t('settings.nextcloudLinkHint') }}</p>
        </template>

        <div v-if="ncMsg" class="notice" style="margin-top: 12px">{{ ncMsg }}</div>
        <div v-if="ncError" class="error" style="margin-top: 12px">{{ ncError }}</div>
        <div v-if="sync.syncError && !ncError" class="error" style="margin-top: 12px">{{ sync.syncError }}</div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.page-title {
  font-size: 26px;
  margin-bottom: 20px;
}

.card + .card {
  margin-top: 16px;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.card-title--icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn--narrow {
  width: auto;
  padding: 10px 16px;
}

.nc-test {
  font-size: 13px;
}

.nc-test--err {
  color: var(--color-danger);
  background: var(--color-danger-soft);
  border-color: var(--color-danger);
}
</style>