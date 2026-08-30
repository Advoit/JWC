<script setup lang="ts">
import PagePlaceholder from '../../components/PagePlaceholder.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <PagePlaceholder :title="t('nav.sub.lifeMinistry')" icon="checklist" />
</template>