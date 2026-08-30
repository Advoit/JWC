<script setup lang="ts">
/**
 * Responsive Navigation.
 *  – Desktop (≥768px): feste, grüne Seitenleiste links; jeder Haupteintrag
 *    zeigt seine Unterpunkte direkt sichtbar an.
 *  – Mobile (<768px): untere Icon-Leiste mit Pop-Auswahl oberhalb des Taps.
 * Daten (Liste der Gruppen) kommen zentral aus navigation.ts (DRY).
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import { NAV_GROUPS } from '../config/navigation'
import { useSessionStore } from '../stores/session'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const session = useSessionStore()

const activeKey = ref<string | null>(null)

// Popup-Position (mobile): links am Icon ausgerichtet, aber im Viewport gehalten.
const popupLeft = ref<number | null>(null)
let anchorButton: HTMLElement | null = null

const POPUP_MARGIN = 12

function positionPopup(): void {
  if (!anchorButton) return
  const group = anchorButton.closest('.bottomnav__group')
  const popup = group?.querySelector<HTMLElement>('.popup')
  if (!popup) return
  const rect = anchorButton.getBoundingClientRect()
  const width = popup.offsetWidth
  const maxLeft = window.innerWidth - width - POPUP_MARGIN
  // Linkkante des Popups an der Linkkante des Buttons ausrichten; nur wenn
  // rechts nicht genug Platz ist, nach links schieben (nie über den Rand).
  popupLeft.value = Math.max(POPUP_MARGIN, Math.min(rect.left, maxLeft))
}

function onWindowResize(): void {
  if (activeKey.value) positionPopup()
}

/** Schließt das Popup bei Tap außerhalb der Navbar (Backdrop-Tap). */
function onDocumentPointerDown(event: PointerEvent): void {
  if (!activeKey.value) return
  const target = event.target as HTMLElement | null
  if (!target?.closest('.bottomnav')) {
    activeKey.value = null
    popupLeft.value = null
    anchorButton = null
  }
}

onMounted(() => {
  window.addEventListener('resize', onWindowResize)
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})

/** Nur sichtbare Unterpunkte (Admin-Einträge nur nach Freischaltung). */
function visibleSub(group: (typeof NAV_GROUPS)[number]) {
  return group.sub.filter((item) => !item.adminOnly || session.isAdminUnlocked)
}

/** Aktiver Zustand: Pfad matcht. */
function isItemActive(item: (typeof NAV_GROUPS)[number]['sub'][number]): boolean {
  return route.path === item.to
}

const isGroupActive = (group: (typeof NAV_GROUPS)[number]) =>
  group.sub.some((item) => route.path === item.to)

const firstName = computed(() => session.firstName)
const displayGreeting = computed(() =>
  firstName.value ? t('page.helloUser', { name: firstName.value }) : t('settings.namePlaceholder')
)

function toggle(groupKey: string, event: Event): void {
  const opening = activeKey.value !== groupKey
  activeKey.value = opening ? groupKey : null
  popupLeft.value = null
  anchorButton = opening ? (event.currentTarget as HTMLElement) : null
  if (opening) requestAnimationFrame(positionPopup)
}

function openItem(item: (typeof NAV_GROUPS)[number]['sub'][number]): void {
  activeKey.value = null
  if (item.action === 'logout') {
    session.logout()
    router.push({ name: 'landing' })
    return
  }
  router.push(item.to)
}

function openUserMenu(): void {
  activeKey.value = null
  router.push({ name: 'settingsProfil' })
}
</script>

<template>
  <!-- ===== Desktop: grüne Seitenleiste ===== -->
  <nav class="sidebar" aria-label="Hauptnavigation">
    <router-link :to="{ name: 'dashboard' }" class="sidebar__brand">
      <span class="brand-dot" />
      <span>JWC</span>
    </router-link>

    <div class="sidebar__groups">
      <div v-for="group in NAV_GROUPS" :key="group.key" class="side-group">
        <div class="side-group__head">
          <AppIcon :name="group.icon" :size="18" />
          <span>{{ t(group.labelKey) }}</span>
        </div>
        <div class="side-group__items">
          <button
            v-for="item in visibleSub(group)"
            :key="item.key"
            class="side-item"
            :class="{ 'is-active': isItemActive(item) }"
            @click="openItem(item)"
          >
            {{ t(item.labelKey) }}
          </button>
        </div>
      </div>
    </div>

    <div class="sidebar__foot">
      <button class="sidebar__user" @click="openUserMenu">
        <span class="sidebar__user-name">{{ displayGreeting }}</span>
        <span class="sidebar__user-dot"><AppIcon name="user" :size="15" /></span>
      </button>
    </div>
  </nav>

  <!-- ===== Mobile: untere Icon-Leiste ===== -->
  <nav class="bottomnav" aria-label="Hauptnavigation mobil">
    <div v-for="group in NAV_GROUPS" :key="group.key" class="bottomnav__group">
      <button
        class="bottomnav__link"
        :class="{ 'is-active': isGroupActive(group) }"
        @click="toggle(group.key, $event)"
      >
        <AppIcon :name="group.icon" :size="22" />
        <span>{{ t(group.labelKey) }}</span>
      </button>

      <Transition name="pop">
        <div
          v-if="activeKey === group.key"
          class="popup"
          :style="popupLeft !== null ? { left: popupLeft + 'px' } : undefined"
        >
          <button
            v-for="item in visibleSub(group)"
            :key="item.key"
            class="popup__item"
            :class="{ 'is-active': isItemActive(item) }"
            @click="openItem(item)"
          >
            {{ t(item.labelKey) }}
          </button>
        </div>
      </Transition>
    </div>
  </nav>
</template>

<style scoped>
/* ===== Desktop-Sidebar (nur ab 768px sichtbar) ===== */
.sidebar {
  display: none;
}

@media (min-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 40;
    width: var(--sidebar-width, 264px);
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%);
    color: #fff;
    padding: 22px 14px;
    box-sizing: border-box;
  }

  .sidebar__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 18px;
    color: #fff;
    padding: 0 8px 20px;
  }

  .brand-dot {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: #fff;
    display: inline-block;
    background-image: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), transparent 60%);
  }

  .sidebar__groups {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .side-group__head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.72);
    padding: 0 10px 6px;
  }

  .side-group__items {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .side-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 9px 10px 9px 14px;
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
    background: transparent;
    border: none;
    border-radius: 8px;
    border-left: 3px solid transparent;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .side-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .side-item.is-active {
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    border-left-color: #fff;
  }

  .sidebar__foot {
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }

  .sidebar__user {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    color: #fff;
    background: transparent;
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }

  .sidebar__user:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .sidebar__user-name {
    flex: 1;
    text-align: left;
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .sidebar__user-dot {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff;
    color: var(--color-accent);
    flex-shrink: 0;
  }
}

/* ===== Mobile-Bottomnav (nur < 768px sichtbar) ===== */
.bottomnav {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: var(--navbar-height);
  justify-content: space-between;
  align-items: stretch;
  padding: 6px 10px;
  background: var(--bar-bg);
  backdrop-filter: saturate(180%) blur(18px);
  border-top: 1px solid var(--bar-border);
  box-sizing: border-box;
}

.bottomnav__group {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.bottomnav__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  padding: 4px 2px;
  font-size: 10px;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}

.bottomnav__link.is-active {
  color: var(--color-accent);
}

/* Popup über der unteren Leiste: Linkkante per JS am getippten Button
   ausgerichtet, im Viewport gehalten; bei Überlänge scrollbar. */
.popup {
  position: fixed;
  bottom: calc(var(--navbar-height) + 12px);
  left: 0;
  width: max-content;
  max-width: min(86vw, 320px);
  min-width: 180px;
  max-height: 52vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  padding: 6px;
  display: flex;
  flex-direction: column;
}

.popup__item {
  text-align: left;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.popup__item:hover,
.popup__item.is-active {
  background: var(--color-accent-soft);
  color: var(--color-accent-dark);
}

/* Öffnen: sanftes Slide + leichtes Aufskalieren vom Icon aus (Ursprung unten). */
.pop-enter-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.2s cubic-bezier(0.34, 1.3, 0.64, 1);
  transform-origin: bottom center;
}

/* Schließen: schnell und dezent zurück. */
.pop-leave-active {
  transition:
    opacity 0.12s ease-in,
    transform 0.12s ease-in;
  transform-origin: bottom center;
}

.pop-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

.pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

@media (min-width: 768px) {
  .bottomnav {
    display: none;
  }
}
</style>