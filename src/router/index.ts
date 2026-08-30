/**
 * App-Router. Es gibt eine öffentliche Landing-Route und einen geschützten
 * Bereich (`/app/...`), der nur nach Login erreichbar ist (Auth-Guard).
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useSessionStore } from '../stores/session'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../views/LandingView.vue'),
    meta: { public: true },
  },
  {
    path: '/app',
    component: () => import('../views/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
      },
      // ----- Aufgaben -----
      { path: 'aufgaben/leben', name: 'lifeMinistry', component: () => import('../views/pages/LifeMinistryView.vue') },
      { path: 'aufgaben/technik', name: 'techOrdner', component: () => import('../views/pages/TechOrdnerView.vue') },
      { path: 'aufgaben/treffpunkte', name: 'treffpunkte', component: () => import('../views/pages/TreffpunkteView.vue') },
      { path: 'aufgaben/vortragsliste', name: 'vortragsliste', component: () => import('../views/pages/VortragslisteView.vue') },
      { path: 'aufgaben/hauptreinigung', name: 'hauptreinigung', component: () => import('../views/pages/HauptreinigungView.vue') },
      { path: 'aufgaben/zwischenreinigung', name: 'zwischenreinigung', component: () => import('../views/pages/ZwischenreinigungView.vue') },
      // ----- Gebiete -----
      { path: 'gebiete/alle', name: 'alleGebiete', component: () => import('../views/pages/AlleGebieteView.vue') },
      { path: 'gebiete/meine', name: 'meineGebiete', component: () => import('../views/pages/MeineGebieteView.vue') },
      { path: 'gebiete/auslage', name: 'auslage', component: () => import('../views/pages/AuslageView.vue') },
      // ----- Dokumente -----
      { path: 'dokumente', name: 'dokumente', component: () => import('../views/pages/DokumenteView.vue') },
      // ----- Versammlung -----
      { path: 'versammlung/gruppen', name: 'gruppen', component: () => import('../views/pages/GruppenView.vue') },
      { path: 'versammlung/pioniere', name: 'pioniere', component: () => import('../views/pages/PioniereView.vue') },
      { path: 'versammlung/termine', name: 'wichtigeTermine', component: () => import('../views/pages/WichtigeTermineView.vue') },
      // ----- Einstellungen (Unterseiten) -----
      { path: 'einstellungen', name: 'settings', redirect: { name: 'settingsProfil' } },
      { path: 'einstellungen/profil', name: 'settingsProfil', component: () => import('../views/pages/SettingsProfilView.vue') },
      { path: 'einstellungen/sprache', name: 'settingsSprache', component: () => import('../views/pages/SettingsSpracheView.vue') },
      { path: 'einstellungen/sicherung', name: 'settingsSicherung', component: () => import('../views/pages/SettingsSicherungView.vue') },
      { path: 'einstellungen/wiederherstellung', name: 'settingsWiederherstellung', component: () => import('../views/pages/SettingsWiederherstellungView.vue') },
      { path: 'einstellungen/verwaltung', name: 'settingsVerwaltung', component: () => import('../views/pages/AdminView.vue') },
      { path: 'einstellungen/verwaltung/gruppen', name: 'settingsVerwaltungGruppen', component: () => import('../views/pages/GruppenVerwaltungView.vue') },
      { path: 'einstellungen/verwaltung/treffpunkte', name: 'settingsVerwaltungTreffpunkte', component: () => import('../views/pages/TreffpunkteVerwaltungView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const session = useSessionStore()
  if (to.meta.public) {
    if (session.isLoggedIn) return { name: 'dashboard' }
    return true
  }
  if (!session.isLoggedIn) {
    if (session.canUnlock) session.restore()
    if (!session.isLoggedIn) return { name: 'landing' }
  }
  return true
})