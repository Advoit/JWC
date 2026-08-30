<script setup lang="ts">
/**
 * Kleines SVG-Icon-Set auf Basis der offiziellen **Tabler Icons**
 * (https://tabler.io/icons, MIT-Lizenz). Die Pfade stammen 1:1 aus
 * `@tabler/icons/icons/outline/*.svg` (24×24-Raster, 2px Stroke).
 *
 * Neue Icons einbauen:
 *  1. Icon auf https://tabler.io/icons suchen (z. B. „calendar").
 *  2. SVG aus `node_modules/@tabler/icons/icons/outline/<name>.svg` kopieren
 *     und alle `<path d="…">`-Werte hier als ein String eintragen.
 *  3. Namen in `paths` verwenden – bestehende Aufrufer ändern sich nicht.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), {
  size: 22,
})

const paths: Record<string, string> = {
  // checklist
  checklist:
    'M9.615 20h-2.615a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8 ' +
    'M14 19l2 2l4 -4 ' +
    'M9 8h4 M9 12h2',
  // map
  map:
    'M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13 ' +
    'M9 4v13 M15 7v13',
  // files (Dokumente)
  documents:
    'M15 3v4a1 1 0 0 0 1 1h4 ' +
    'M18 17h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h4l5 5v7a2 2 0 0 1 -2 2 ' +
    'M16 17v2a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2',
  // users-group (Versammlung)
  group:
    'M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 ' +
    'M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1 ' +
    'M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 ' +
    'M17 10h2a2 2 0 0 1 2 2v1 ' +
    'M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 ' +
    'M3 13v-1a2 2 0 0 1 2 -2h2',
  // settings (Zahnrad)
  gear:
    'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065 ' +
    'M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
  // home
  home:
    'M5 12l-2 0l9 -9l9 9l-2 0 ' +
    'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7 ' +
    'M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6',
  // user
  user:
    'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 ' +
    'M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2',
  // chevron-down
  chevron: 'M6 9l6 6l6 -6',
  // notes (Hinweise)
  notes:
    'M5 5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -14 ' +
    'M9 7l6 0 M9 11l6 0 M9 15l4 0',
  // calendar (Termine)
  calendar:
    'M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12 ' +
    'M16 3v4 M8 3v4 M4 11h16 M11 15h1 M12 15v3',
  // download (Sicherung)
  download:
    'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 ' +
    'M7 11l5 5l5 -5 ' +
    'M12 4l0 12',
  // upload (Wiederherstellung)
  upload:
    'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 ' +
    'M7 9l5 -5l5 5 ' +
    'M12 4l0 12',
  // cloud (Nextcloud)
  cloud:
    'M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878',
  // plus
  plus: 'M12 5l0 14 M5 12l14 0',
  // pencil (Bearbeiten)
  pencil:
    'M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4 ' +
    'M13.5 6.5l4 4',
  // trash (Entfernen)
  trash:
    'M4 7l16 0 M10 11l0 6 M14 11l0 6 ' +
    'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12 ' +
    'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
  // eye (Anzeigen)
  eye:
    'M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 ' +
    'M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6',
  // eye-off (Verbergen)
  eyeOff:
    'M10.585 10.587a2 2 0 0 0 2.829 2.828 ' +
    'M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87 ' +
    'M3 3l18 18',
}

const d = computed(() => paths[props.name] ?? paths.checklist)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>