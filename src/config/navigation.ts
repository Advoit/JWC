/**
 * Zentrale Navigations-Definition (DRY): Die Navbar und alle Pop-Menüs werden
 * aus dieser einen Quelle gespeist. Jeder Haupteintrag besitzt Unterpunkte,
 * die als Pop-Auswahl angezeigt werden.
 */
export interface NavItem {
  key: string
  labelKey: string
  to: string
  /** Optionale Aktion statt Navigation (z. B. Logout). */
  action?: 'logout'
  /** Nur sichtbar, wenn der Admin freigeschaltet ist. */
  adminOnly?: boolean
}

export interface NavGroup {
  key: string
  labelKey: string
  icon: string
  sub: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'tasks',
    labelKey: 'nav.tasks',
    icon: 'checklist',
    sub: [
      { key: 'lifeMinistry', labelKey: 'nav.sub.lifeMinistry', to: '/app/aufgaben/leben' },
      { key: 'techOrdner', labelKey: 'nav.sub.techOrdner', to: '/app/aufgaben/technik' },
      { key: 'treffpunkte', labelKey: 'nav.sub.treffpunkte', to: '/app/aufgaben/treffpunkte' },
      { key: 'vortragsliste', labelKey: 'nav.sub.vortragsliste', to: '/app/aufgaben/vortragsliste' },
      { key: 'hauptreinigung', labelKey: 'nav.sub.hauptreinigung', to: '/app/aufgaben/hauptreinigung' },
      { key: 'zwischenreinigung', labelKey: 'nav.sub.zwischenreinigung', to: '/app/aufgaben/zwischenreinigung' },
    ],
  },
  {
    key: 'territories',
    labelKey: 'nav.territories',
    icon: 'map',
    sub: [
      { key: 'alleGebiete', labelKey: 'nav.sub.alleGebiete', to: '/app/gebiete/alle' },
      { key: 'meineGebiete', labelKey: 'nav.sub.meineGebiete', to: '/app/gebiete/meine' },
      { key: 'auslage', labelKey: 'nav.sub.auslage', to: '/app/gebiete/auslage' },
    ],
  },
  {
    key: 'documents',
    labelKey: 'nav.documents',
    icon: 'documents',
    sub: [{ key: 'dokumente', labelKey: 'nav.documents', to: '/app/dokumente' }],
  },
  {
    key: 'congregation',
    labelKey: 'nav.congregation',
    icon: 'group',
    sub: [
      { key: 'gruppen', labelKey: 'nav.sub.gruppen', to: '/app/versammlung/gruppen' },
      { key: 'pioniere', labelKey: 'nav.sub.pioniere', to: '/app/versammlung/pioniere' },
      { key: 'wichtigeTermine', labelKey: 'nav.sub.wichtigeTermine', to: '/app/versammlung/termine' },
    ],
  },
  {
    key: 'settings',
    labelKey: 'nav.settings',
    icon: 'gear',
    sub: [
      { key: 'settingsProfil', labelKey: 'settings.profile', to: '/app/einstellungen/profil' },
      { key: 'settingsSprache', labelKey: 'settings.languageAppearance', to: '/app/einstellungen/sprache' },
      { key: 'settingsLogout', labelKey: 'common.logout', to: '', action: 'logout' },
      { key: 'settingsSicherung', labelKey: 'settings.sicherung', to: '/app/einstellungen/sicherung', adminOnly: true },
      { key: 'settingsWiederherstellung', labelKey: 'settings.wiederherstellung', to: '/app/einstellungen/wiederherstellung', adminOnly: true },
      { key: 'settingsVerwaltung', labelKey: 'settings.verwaltung', to: '/app/einstellungen/verwaltung', adminOnly: true },
    ],
  },
]