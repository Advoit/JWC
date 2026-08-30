<script setup lang="ts">
import NavBar from '../components/NavBar.vue'
import OfflineBanner from '../components/OfflineBanner.vue'
import { useAutoSync } from '../composables/useAutoSync'

// 2-Wege-Live-Sync: initialer Pull + Push bei Änderungen (wenn gekoppelt).
useAutoSync()
</script>

<template>
  <div class="app-shell">
    <OfflineBanner />
    <main class="app-main">
      <router-view />
    </main>
    <NavBar />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  padding-bottom: calc(var(--navbar-height) + 16px);
}

@media (min-width: 768px) {
  .app-main {
    padding-bottom: 40px;
    padding-left: var(--sidebar-width, 264px);
  }
}
</style>