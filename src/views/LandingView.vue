<script setup lang="ts">
/**
 * Öffentliche Landing-Page: Login bestehender Versammlung und Erstellung einer
 * neuen. Zugangsdaten werden lokal gespeichert (Local-first). Nextcloud ist
 * optional und wird nur für verschlüsselte Sicherungen genutzt.
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../stores/session'
import { storage } from '../services/storage'
import { validatePassword, PASSWORD_POLICY } from '../services/passwordPolicy'
import type { CongregationData } from '../types'

const router = useRouter()
const session = useSessionStore()
const { t } = useI18n()

const activeTab = ref<'login' | 'register'>('login')
const errorMsg = ref('')
const noticeMsg = ref('')
const busy = ref(false)

// Login
const loginCongregation = ref('')
const loginPassword = ref('')

// Erstellung
const regName = ref('')
const regPassword = ref('')
const regAdminPassword = ref('')
const regNextcloudUrl = ref('')
const regNextcloudUser = ref('')
const regNextcloudPass = ref('')

// Für Login über ein Gerät: Vorschlag, falls eine Versammlung existiert.
const existing = computed<CongregationData | null>(() => {
  const d = storage.getCongregation() as CongregationData | null
  if (!d) return null
  // Nur wenn das Passwort noch bekannt ist; sonst zeigt das Login-Feld umsonst.
  return d
})

// Live-Validierung (DRY: nutzt dasselbe Service wie die Submit-Prüfung)
const passErrors = ref<string[]>([])
const adminErrors = ref<string[]>([])

function checkPass(which: 'pass' | 'admin', password: string): void {
  const res = validatePassword(password)
  const codes = res.valid ? [] : res.errors
  if (which === 'pass') passErrors.value = codes as unknown as string[]
  else adminErrors.value = codes as unknown as string[]
}

async function doLogin(): Promise<void> {
  errorMsg.value = ''
  busy.value = true
  const d = existing.value
  if (!d) {
    errorMsg.value = 'Noch kein Konto vorhanden. Bitte Versammlung zuerst erstellen.'
    busy.value = false
    return
  }
  const id = loginCongregation.value.trim() || d.id
  const ok = await session.login(id, d.name, loginPassword.value)
  busy.value = false
  if (ok) {
    router.push({ name: 'dashboard' })
  } else {
    errorMsg.value = 'Anmeldung fehlgeschlagen. Prüfe Versammlung und Passwort.'
  }
}

async function doRegister(): Promise<void> {
  errorMsg.value = ''
  noticeMsg.value = ''
  busy.value = true
  try {
    if (!regName.value.trim() || !regPassword.value || !regAdminPassword.value) {
      errorMsg.value = 'Bitte alle Pflichtfelder ausfüllen.'
      busy.value = false
      return
    }
    if (!validatePassword(regPassword.value).valid || !validatePassword(regAdminPassword.value).valid) {
      errorMsg.value = t('password.policyHint', { min: PASSWORD_POLICY.minLength })
      busy.value = false
      return
    }
    const nextcloud =
      regNextcloudUrl.value.trim() && regNextcloudUser.value.trim()
        ? {
            url: regNextcloudUrl.value.trim(),
            user: regNextcloudUser.value.trim(),
            appPassword: regNextcloudPass.value,
          }
        : undefined
    await session.createCongregation(
      regName.value,
      regPassword.value,
      regAdminPassword.value,
      nextcloud
    )
    noticeMsg.value = t('landing.successCreated')
    router.push({ name: 'dashboard' })
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Unbekannter Fehler'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="landing">
    <div class="landing__inner">
      <header class="landing__brand">
        <span class="brand-dot" />
        <h1>{{ t('app.name') }}</h1>
      </header>
      <p class="landing__sub">{{ t('landing.subtitle') }}</p>

      <div class="card landing__card">
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'login' }" @click="activeTab = 'login'">
            {{ t('landing.loginTab') }}
          </button>
          <button class="tab" :class="{ active: activeTab === 'register' }" @click="activeTab = 'register'">
            {{ t('landing.registerTab') }}
          </button>
        </div>

        <div v-if="activeTab === 'login'">
          <h2 class="form-title">{{ t('landing.loginTitle') }}</h2>
          <p v-if="existing" class="hint" style="margin-bottom: 8px">
            Angemeldet als <strong>{{ existing.name }}</strong>
          </p>

          <div class="field">
            <label for="f_congr_login">{{ t('landing.congregation') }}</label>
            <input id="f_congr_login" v-model="loginCongregation" class="input" :placeholder="existing?.name ?? t('landing.congregation')" />
          </div>
          <div class="field">
            <label for="f_pass_login">{{ t('landing.password') }}</label>
            <input id="f_pass_login" v-model="loginPassword" type="password" class="input" @keyup.enter="doLogin" />
            <p class="hint" style="margin-top: 6px">{{ t('landing.loginHint') }}</p>
          </div>

          <button class="btn btn--primary btn--block" :disabled="busy" @click="doLogin">
            {{ t('landing.loginButton') }}
          </button>
        </div>

        <div v-else>
          <h2 class="form-title">{{ t('landing.registerTitle') }}</h2>
          <p class="hint" style="margin-bottom: 12px">{{ t('landing.registerHint') }}</p>

          <div class="field">
            <label for="f_congr">{{ t('landing.congregation') }} *</label>
            <input id="f_congr" v-model="regName" class="input" />
          </div>
          <div class="field">
            <label for="f_pass">{{ t('landing.password') }} *</label>
            <input id="f_pass" v-model="regPassword" type="password" class="input" @input="checkPass('pass', regPassword)" />
            <ul v-if="passErrors.length" class="pw-errors">
              <li v-for="code in passErrors" :key="code">{{ t('password.errors.' + code) }}</li>
            </ul>
          </div>
          <div class="field">
            <label for="f_admin">{{ t('landing.adminPassword') }} *</label>
            <input id="f_admin" v-model="regAdminPassword" type="password" class="input" @input="checkPass('admin', regAdminPassword)" />
            <ul v-if="adminErrors.length" class="pw-errors">
              <li v-for="code in adminErrors" :key="code">{{ t('password.errors.' + code) }}</li>
            </ul>
          </div>
          <p class="hint pw-hint">{{ t('password.policyHint', { min: PASSWORD_POLICY.minLength }) }}</p>

          <div class="divider" />
          <p class="hint" style="margin-bottom: 12px">{{ t('landing.nextcloudHint') }}</p>

          <div class="field">
            <label for="f_nc_url">{{ t('landing.nextcloudUrl') }}</label>
            <input id="f_nc_url" v-model="regNextcloudUrl" class="input" placeholder="https://…" />
          </div>
          <div class="field">
            <label for="f_nc_user">{{ t('landing.nextcloudUser') }}</label>
            <input id="f_nc_user" v-model="regNextcloudUser" class="input" />
          </div>
          <div class="field">
            <label for="f_nc_pass">{{ t('landing.nextcloudPass') }}</label>
            <input id="f_nc_pass" v-model="regNextcloudPass" type="password" class="input" />
          </div>

          <button class="btn btn--primary btn--block" :disabled="busy" @click="doRegister">
            {{ t('landing.registerButton') }}
          </button>
        </div>

        <div v-if="errorMsg" class="error" style="margin-top: 14px">{{ errorMsg }}</div>
        <div v-if="noticeMsg" class="notice" style="margin-top: 14px">{{ noticeMsg }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, var(--color-accent-soft) 0%, var(--color-bg) 42%);
  padding: 24px;
}

.landing__inner {
  width: 100%;
  max-width: 440px;
}

.landing__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.brand-dot {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-accent);
  background-image: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), transparent 60%);
}

.landing__brand h1 {
  font-size: 28px;
}

.landing__sub {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 15px;
  margin: 8px 0 24px;
}

.card {
  padding: 24px;
}

.tabs {
  display: flex;
  background: var(--color-bg);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.tab {
  flex: 1;
  padding: 10px;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  color: var(--color-text-muted);
}

.tab.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.form-title {
  font-size: 20px;
  margin-bottom: 8px;
}

.divider {
  border-top: 1px solid var(--color-border);
  margin: 16px 0;
}

.pw-errors {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
}

.pw-errors li {
  font-size: 12px;
  color: var(--color-warning);
  margin-top: 2px;
}

.pw-hint {
  font-size: 12px;
  margin-top: -6px;
}
</style>