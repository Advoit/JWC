# Hinweise für künftige Entwicklungssessions
Hast du fragen, stell diese zuerst bevor du mit dem Projekt startest
Regeln: DRY-Prinzip (Don't Repeat Yourself),SRP (Single Responsibility Principle),  Klassen/Module: max. 500 Zeilen,
Benennungsregeln: Wie extrahierte Methoden und neue Klassen sinnvoll benannt werden (sprechende Namen, die den Zweck klar machen), Datenmigration möglichst hohe abwärts kompatibilität zu alten app Versionen/ Datenbanken
Man soll später sprachen ändern können, passe die app diesbezüglich an
Hohe Sicherheit bei der Kommunikation zwischen Server und unser, gute Verschlüsselung auch auf dem Server.
Ausnahmen: Ein Hinweis, die Ausnahmen bei max Zeilen (z.B. bei Datenklassen oder DTOs) begründet werden dürfen.
Design: minimalistisch, modern, Flat, Apple like, Akzentfarbe grün, dynamisch Anpassung des UI an mobile, PC und tablet.
alles soll sich einfach zu nutzen anfühlen


Diese Datei dient dazu, dass eine neue Session sofort weitermachen kann,
ohne die ganze Codebasis neu lesen zu müssen. **Diese Datei stets aktuell halten.**

## Was ist JWC?

- **JWC** = Versammlungsverwaltung (Jehovas Zeugen / Königreichssaal).
- Vollständig **offline nutzbare PWA** (Service-Worker via `vite-plugin-pwa`).
- **Local-first:** Alle Zugangsdaten & Inhalte liegen lokal im Browser
  (`localStorage`). Die App braucht keinen eigenen Server.
- **Nextcloud-optional:** Sicherungen können verschlüsselt via WebDAV (Basic-Auth
  über HTTPS) hochgeladen werden. Auf dem Server liegt **nie Klartext**.

## Entscheidungen (mit User abgestimmt)

- Stack: **Vue 3 + Vite + TypeScript**. State: **Pinia**. Routing: **Vue Router**.
- Nur **Deutsch** aktuell; i18n-Struktur (vue-i18n) ist vorbereitet.
- Login-Modell: **eine Versammlung = ein Konto** (lokal gespeichert), **zwei
  Passwörter**: normales Passwort (Login) und Admin-Passwort (Login + Verwaltung).
  Wer sich mit dem Admin-Passwort anmeldet, sieht Verwaltungsfunktionen
  (Sicherung/Wiederherstellung/Verwaltung); das Admin-Passwort dient zusätzlich
  der Verschlüsselung. Admin-Status wird in der Sitzung persistiert.
- Design: minimalistisch, flat, Apple-like, **Akzentfarbe grün** (#34c759), responsiv.
- **Dunkelmodus:** `services/theme.ts` + `composables/useTheme.ts` mit Modi
  System/Hell/Dunkel (localStorage `jwc.theme`). Wird per `data-theme="dark"`
  auf `<html>` geschaltet; style.css enthält dafür eigene Variablen (inkl.
  dunklerer grüner Sidebar via `--sidebar-start/--sidebar-end`). Umschalter in
  den Einstellungen („Sprache & Darstellung“).
- **App-Icons (Navbar/Menüs):** `components/AppIcon.vue` nutzt **Tabler Icons**
  (https://tabler.io/icons, MIT, 24×24, 2px Stroke). Künftige Icons: SVG aus
  `node_modules/@tabler/icons/icons/outline/<name>.svg` (devDependency, offizielles
  Paket) kopieren und alle `<path d>`-Werte in die `paths`-Map eintragen.
  Bestehende Namen (checklist, map, documents, group, gear, home, user, chevron,
  notes, calendar, download, upload, cloud, plus, pencil, trash, eye, eyeOff)
  bleiben erhalten.
- **PWA-Icons/Farben:** `public/favicon.svg` + `public/icons/icon-192.svg` +
  `icon-512.svg` enthalten eine `prefers-color-scheme: dark`-Variante (dunkles
  Markengrün #1d3324/#162619) – Icons passen sich automatisch an. Manifest in
  `vite.config.ts`: `theme_color: '#1d3324'`, `background_color: '#101012'`
  (dunkles Theme). Das `<meta name="theme-color">` wird zur Laufzeit von
  `theme.ts` an den gewählten Modus angeglichen (Werte identisch zum Manifest).
- Release: **GitHub Pages**. Vite-`base` ist relativ (`. /`), damit die App unter
  beliebigem Pfad funktioniert. Damit das Build für Pages korrekt ist: `GH_PAGES=true`.
- Regeln: DRY, SRP (Single Responsibility), Max. **500 Zeilen je Klasse/Modul**.
  Sprechende Namen; Datenmigration hohe Abwärtskompatibilität.

## Architektur / Code-Karte

```
index.html
vite.config.ts          # Vue + PWA; base relativ; GH_PAGES=true → /JWC/
src/
  main.ts               # Bootstrap: Pinia, Router, i18n, SW-Registrierung
  App.vue               # nur <router-view/>
  style.css             # Design-System-Variablen + Utility-Klassen (.card, .btn, .field …)
  types/index.ts        # STORAGE_VERSION, CongregationData, StoredSession, Backup*
  i18n/index.ts         # vue-i18n Setup; locales/de.ts (alle deutschen Texte)
  config/navigation.ts  # ZENTRALE Navigations-Definition → NavBar + Pop-Menüs (DRY)
  router/index.ts       # Routen + Auth-Guard; Hash-History (GH-Pages-sicher)
  services/
    crypto.ts           # WebCrypto: PBKDF2-Hash/Verify, AES-GCM encrypt/decrypt,
                        #   Geräteschlüssel (AES-GCM) für lokal verschlüsselte Geheimnisse
    storage.ts          # versionierter localStorage; migrate() für Abwärtskompatibilität
    backup.ts           # createBackup / verifyAndDecryptBackup / verifyAdmin (Download-Sicherung)
    nextcloud.ts        # WebDAV-Client (putFile/getFile/putBlob/getBlob/makeDir/deleteFile,
                        #   TLS, Basic-Auth; Netzwerkfehler klassifiziert: cors/offline/tls/dns)
    sync.ts             # 2-Wege-Live-Sync: verschlüsselter Snapshot, Merge nach updatedAt/ID
    sync.test.ts        # vitest: Zwei-Profil-Sync gegen Fake-WebDAV (npm test)
    theme.ts            # Dunkelmodus: System/Hell/Dunkel auflösen + auf <html> anwenden
  composables/useOffline.ts  # online/offline ref → Banner
  composables/useAutoSync.ts # initialer Pull, Push bei Änderung (debounced), Sync bei Wiederonline
  composables/useTheme.ts    # reaktiver Theme-Modus (System/Hell/Dunkel) für die Einstellungen
  stores/session.ts     # Pinia: Kongregation, Login, Profil, Admin-Unlock, reset
  stores/sync.ts        # Pinia: Sync-Status, Kopplung/Lösen, App-Passwort verschlüsselt, syncNow()
  stores/congregation.ts # Pinia: Personen, Gruppen, Treffpunkte & Dokument-Knoten
                        #   als StoredItems (CRUD, Persistenz, Sync)
  stores/documents.ts    # Pinia: Dokument-Inhaltsops (Upload/Download/Löschen),
                        #   Ziel = Nextcloud (verschlüsselt) oder lokaler Fallback
  services/congregation.ts # reine Helfer: personName, Sortierung, groupMembers,
                        #   Rollen, Treffpunkt-Gruppierung nach Datum, Zuordnung zum
                        #   Benutzer & Wochenfilter (isTreffpunktAssignedTo, treffpunkteInWeek)
  services/documents.ts  # reine Helfer: Baumsortierung, Name-VALIDIERUNG, Zykluscheck
  services/docContent.ts # Speicherort für Datei-Bytes: Nextcloud oder localStorage,
                        #   AES-GCM verschlüsselt (Versammlungsschlüssel)
  services/documents.test.ts # vitest: Dokumenten-Helfer (Sortierung, Zyklen, Namen)
    views/
    AppLayout.vue       # Shell: OfflineBanner + NavBar + <router-view/> + useAutoSync()
    LandingView.vue     # Tabs Login | Versammlung erstellen
    DashboardView.vue   # Hallo-Name, Hinweise, Meine Aufgaben, Wochenübersicht
    pages/              # Platzhalter-Seiten (über PagePlaceholder)
    pages/Settings*.vue # Einstellungs-Unterseiten (Profil, Sprache&Darstellung,
                        #   Sicherung, Wiederherstellung, Verwaltung)
  components/
    NavBar.vue          # Desktop: grüne linke Sidebar mit sichtbaren Unterpunkten;
                        # Mobile: untere Icon-Leiste, Popup fest im Viewport zentriert;
                        # Admin-Einträge (adminOnly) nur nach Admin-Anmeldung sichtbar
    AppIcon.vue         # SVG-Icon-Set auf Basis von Tabler Icons (tabler.io, MIT)
    PagePlaceholder.vue # wiederverwendbare Platzhalter-Seite (DRY)
    OfflineBanner.vue   # Hinweis "Du bist offline"
    AppIcon.vue         # SVG-Icon-Set: checklist, map, documents, group, gear,
                        #   home, user, chevron, notes, calendar, download, upload,
                        #   cloud, plus, pencil, trash, eye, eyeOff
public/
  favicon.svg
  icons/icon-192.svg, icon-512.svg
```

## Wichtige Dateien für künftige Schritte

- **Treffpunkte (umgesetzt):** `stores/congregation.ts` hält sie als `StoredItem`
  (`ITEM_TYPE_TREFFPUNKT`, Typ `TreffpunktData`): `dates[]` (beliebig viele,
  ISO; Formular mit „+“-Button fügt beliebig viele Daten hinzu), `general`
  (Boolean „Allgemeiner Treffpunkt“), `groupId` (importiert aus Gruppen),
  `time` (HH:MM), `location`, `leaderName` (optionaler freier Text-Name;
  früheres `leaderId` wird beim Laden automatisch migriert). **Dashboard**
  (`DashboardView.vue`): „Meine Aufgaben“ zeigt Treffpunkte, die allgemein sind
  oder deren `leaderName` meinen Namen enthält (nur zukünftige); die
  „Wochenübersicht“ listet alle Treffpunkte dieser Woche (Mo–So). Öffentlich: `views/pages/TreffpunkteView.vue` gruppiert nach Datum
  (`groupTreffpunkteByDate`), blendet vergangene (Datum < heute) aus; gleiche
  Tage werden zusammengeführt. Verwaltung: `views/pages/TreffpunkteVerwaltungView.vue`
  (Route `/einstellungen/verwaltung/treffpunkte`, Menüpunkt in `AdminView.AREAS`),
  Datum & Uhrzeit als native Picker, kein doppeltes Datum.
- **Dokumente (umgesetzt): Explorer** in `views/pages/DokumenteView.vue`. Baum aus
  `ITEM_TYPE_DOCUMENT`-Knoten (`DocumentNodeData`: `kind` folder|file, `name`,
  `parentId`, `shared`). Inhalte (Bytes) liegen **verschlüsselt** auf Nextcloud
  (`jwc-docs/<congId>/<id>`, AES-GCM mit Versammlungsschlüssel) – ohne
  gekoppelte Nextcloud als lokaler Fallback (`jwc.docContent.<congId>` Map).
  Admin: Ordner, Upload, Umbenennen, Drag&Drop-Verschieben, Löschen (kaskadierend),
  Teilen (`shared`-Flag). Normaler Benutzer: sieht/liest/lädt nur `shared` Inhalte,
  kein Bearbeiten/Verschieben/Löschen. Vorschau inline für Bilder + PDF (pruefbar
  über `services/documents.ts`), sonst Download-Button.
- **Gruppen & Personen (umgesetzt):** `stores/congregation.ts` hält Personen
  (`ITEM_TYPE_PERSON`) und Gruppen (`ITEM_TYPE_GROUP`) als `StoredItem`; persistiert
  unter `jwc.items.<congregationId>`. Gruppen haben `name`, `leaderId` (Leiter =
  dunkler Akzent `--role-leader-*`), `deputyId` (Stellvertreter = heller Akzent
  `--role-deputy-*`) und `memberIds`. Öffentliche Ansicht: `views/pages/GruppenView.vue`
  (Teilnehmer nach Nachname sortiert). Verwaltung: `views/pages/AdminView.vue` ist
  eine Übersicht mit Menüpunkten (aktuell „Gruppen“) → eigene Verwaltungsseite
  `views/pages/GruppenVerwaltungView.vue` (Route `/einstellungen/verwaltung/gruppen`):
  Gruppen erstellen/bearbeiten/löschen, Rollen vergeben, Personen anlegen,
  bearbeiten, verbergen (hidden) oder entfernen. Versteckte Personen erscheinen
  nicht in öffentlichen Ansichten, bleiben in der Verwaltung erhalten.
  **Eindeutige Zuordnung:** Eine Person darf nur in EINER Gruppe sein (Leiter,
  Stellvertreter oder Teilnehmer). Leiter & Stellvertreter sind automatisch auch
  Teilnehmer (in `services/congregation.ts` via `normalizeGroupData` erzwungen).
  Doppelte Vergabe wird in `GruppenVerwaltungView.saveGroup` per
  `conflictingGroupAssignments` geblockt.
- **Platzhalter-Seiten befüllen:** `src/views/pages/*.vue` –
  viele Bereiche zeigen aktuell noch `PagePlaceholder` (Dokumente, Pioniere,
  Termine, alle Aufgaben, Gebiete …).
- **Datenhaltung:** Aufgaben-/Gebiete-Stores folgen dem Muster von
  `stores/congregation.ts` (StoredItems + localStorage + Sync).
- **i18n erweitern:** Neue Locale unter `src/i18n/locales/`, in `availableLocales`
  registrieren und ein Sprachauswahl-Setting ergänzen.
- **Nextcloud-Live-Sync:** Sobald gekoppelt (URL + Benutzer + App-Passwort),
  läuft die Synchronisation automatisch in beide Richtungen (`useAutoSync` in
  `AppLayout`): initialer Pull, Push bei Datenänderung (debounced), Sync bei
  Wiederonline. Manuelle Cloud-Sicherungen gibt es nicht mehr – Sicherungen
  sind nur noch als Download in den Einstellungen.
  **Wichtig – CORS:** GitHub Pages ist rein statisch, dort kann CORS nicht
  serverseitig gelöst werden. Der Client klassifiziert Netzwerkfehler jetzt als
  `nextcloud.conn.{cors|offline|tls|dns|unknown}` und zeigt präzise Diagnosen
  an. Die Behebung von CORS erfolgt auf dem Nextcloud-Server (Access-Control-
  Allow-Origin/Headers/Methods für `remote.php/dav`). Sicherheit: Alle Daten
  sind bereits vor dem Upload AES-GCM-verschlüsselt (Versammlungsschlüssel),
  unabhängig vom Transportweg – ein Proxy würde den Server nie im Klartext sehen.
- **App-Passwort:** Wird AES-GCM mit einem Geräteschlüssel (`crypto.getDeviceKey`)
  verschlüsselt in `congregation.nextcloud.appSecret` abgelegt – nie im Klartext,
  damit automatische Syncs nach Reload ohne erneute Eingabe laufen.
- **Sync-Merge:** `services/sync.ts` vereinigt Snapshot nach `updatedAt`
  (Versammlung) bzw. pro Item-ID (neuere Version gewinnt).
- **Sync-Verschlüsselung (wichtig):** Der Snapshot wird mit dem
  **Versammlungsschlüssel** verschlüsselt (abgeleitet aus adminHash/adminSalt,
  identisch auf allen Geräten) – NICHT mit dem Geräteschlüssel. Sonst kann
  Browser B den Snapshot von Browser A nicht lesen und würde ihn überschreiben.
  Alte Geräteschlüssel-Snapshots werden beim Lesen als Fallback akzeptiert.
  Unlesbare Remote-Dateien werden nie überschrieben, sondern werfen einen
  Fehler (`sync.remoteUnreadable`).
- **Tests:** `npm test` (vitest). `src/services/sync.test.ts` simuliert zwei
  Browser-Profile (eigenes localStorage) gegen einen In-Memory-WebDAV-Server:
  Push/Pull, Merge ohne Verlust, Konfliktlösung (neuere Version gewinnt),
  kein Überschreiben unlesbarer Dateien, geräteübergreifende Entschlüsselung.
  `src/services/congregation.test.ts` testet die Gruppen-/Personen-Helfer
  (Sortierung nach Nachname, Verbergen, Rollen).
- **Einstellungen:** Echte Unterseiten statt Scroll-Ziele: `/einstellungen/profil`,
  `/einstellungen/sprache` (Sprache & Darstellung), `/einstellungen/sicherung`,
  `/einstellungen/wiederherstellung`, `/einstellungen/verwaltung` (AdminView).
  Komponenten in `views/pages/Settings*View.vue`; Fehlertexte-DRY über
  `composables/useErrorText.ts`. Sicherung, Wiederherstellung und Verwaltung
  sind nur für Admin-Sitzungen sichtbar (Menü + Seiten-Hinweis).
  Es gibt keine „Gefahrenzone“ mehr (Reset nur noch durch Store-`resetAll()`).
- **Typecheck:** `npm run typecheck`; **Build:** `npm run build`.

## Konventionen

- Neue Strings bitte über i18n (de.ts), nicht hart kodieren.
- Neue Logik in `services/` auslagern (SRP); Seiten bleiben schlank.
- Module/Klassen unter 500 Zeilen halten.
- Bei Schema-Änderungen: `STORAGE_VERSION` anheben und `migrate()` erweitern,
  sodass alte Daten weiter laden (Abwärtskompatibilität).

## Sicherheit (erfüllt)

- Passwörter: PBKDF2-Hash (SHA-256, 210.000 Iterationen), per `crypto.subtle`.
- Backups: AES-GCM verschlüsselt; Schlüssel aus Admin-Passwort abgeleitet.
- Nextcloud: nur verschlüsselte Blobs über HTTPS; App-Passwort wird AES-GCM
  verschlüsselt (Geräteschlüssel) gespeichert, nie im Klartext.