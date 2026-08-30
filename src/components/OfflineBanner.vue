<script setup lang="ts">
import { useOffline } from '../composables/useOffline'
import { useI18n } from 'vue-i18n'

const { isOnline } = useOffline()
const { t } = useI18n()
</script>

<template>
  <Transition name="fade">
    <div v-if="!isOnline" class="offline-banner" role="status">
      {{ t('offline.offline') }}
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  position: sticky;
  top: 0;
  z-index: 60;
  background: var(--color-warning);
  color: #fff;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>