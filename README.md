# JWC – Versammlungsverwaltung

Eine **dynamische, offline-fähige PWA** zur Verwaltung aller Aktivitäten einer
Versammlung. Die App läuft vollständig ohne Server, speichert Daten lokal im
Browser und kann verschlüsselte Sicherungen optional über **Nextcloud**
(WebDAV) ablegen.

## Was ist das / Nutzen

- **Dashboard:** Begrüßung, Hinweise, „Meine Aufgaben" und die Wochenübersicht.
- **Aufgaben:** Leben und Dienst, Technik und Ordner, Treffpunkte, Vortragsliste,
  Haupt- und Zwischenreinigung.
- **Gebiete:** Alle, eigene sowie Gebiete in der Auslage.
- **Dokumente & Versammlung:** Dokumente, Gruppen, Pioniere, wichtige Termine.
- **Einstellungen:** Lokaler Name, Sprache (demnächst mehr), Sicherung/
  Wiederherstellung und optionale Nextcloud-Synchronisation.
- **Verwaltung:** Nur mit Admin-Passwort zugänglich.

Viele Bereiche sind aktuell als Platzhalter angelegt und werden nach und nach
befüllt (siehe `HINWEISE_FUER_WEITERSESSIONS.md`).

## Lokal starten

```bash
npm install
npm run dev
```

Typecheck und Build:

```bash
npm run typecheck
npm run build
```

## Release über GitHub Pages (Anleitung)

Die App wird als statische Seite auf GitHub Pages veröffentlicht.

1. **Repository anlegen/benennen.** Am einfachsten mit dem Namen `JWC`
   (siehe `vite.config.ts`, `GH_PAGES=true` → Basis `/JWC/`). Andere Namen
   funktionieren ebenfalls, solange `GH_PAGES` gesetzt ist (Basis wird
   automatisch angepasst).

2. **Variant A – Manuell (dist) hochladen:**
   ```bash
   GH_PAGES=true npm run build
   ```
   Die fertigen Dateien liegen in `dist/`. Lade ihren Inhalt in den
   `gh-pages`-Branch ein (Repository → Settings → Pages → Branch `gh-pages`, root).

3. **Variant B – GitHub Actions (empfohlen):**
   Der mitgelieferte Workflow `.github/workflows/static.yml` ist bereits fertig
   hinterlegt. Er führt bei Push auf `main` ein `GH_PAGES=true npm run build`
   aus und veröffentlicht `dist/` via `actions/deploy-pages`.

4. **PWA installieren & offline nutzen.** Nach dem Öffnen erscheint der
   „Installieren"-Prompt/Befehl im Browser. Danach funktioniert die App auch
   ohne Verbindung und zeigt ein Hinweisbanner bei Offline-Betrieb an.

Hinweise zur Fortführung der Entwicklung stehen in
`HINWEISE_FUER_WEITERSESSIONS.md`.

## Sicherheit

- Passwörter werden per **PBKDF2** gehasht und verifiziert (Web Crypto API).
- Sicherungen/Nextcloud-Daten werden per **AES-GCM** verschlüsselt
  (Schlüssel aus dem Admin-Passwort abgeleitet) – der Server sieht nie Klartext.
- Die Nextcloud-Verbindung erzwingt **TLS/HTTPS**.

## Technik

Vue 3 · Vite · TypeScript · Pinia · Vue Router · vue-i18n · vite-plugin-pwa