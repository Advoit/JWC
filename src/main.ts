import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import { i18n } from './i18n'
import { router } from './router'
import { applyStoredTheme } from './services/theme'
import App from './App.vue'
import './style.css'

// Theme vor dem Mount anwenden (kein heller Flicker im Dunkelmodus).
applyStoredTheme()

// PWA-Service-Worker registrieren (Offline-Fähigkeit).
registerSW({ immediate: true })

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')