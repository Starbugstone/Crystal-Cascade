<template>
  <TownDialog :title="t('Take a Forge Hammer?')" :close-label="'Cancel'" @close="$emit('cancel')">
    <p>
      {{
        t(
          'Spend your Forge Charge for one temporary puzzle Hammer in this normal run. It is used before inventory Hammers and expires on completion, exit or reload.',
        )
      }}
    </p>
    <button class="town-primary" @click="$emit('depart', true)">
      {{ t('Spend charge and enter mine') }}
    </button>
    <button class="town-secondary" @click="$emit('depart', false)">
      {{ t('Keep charge and enter mine') }}
    </button>
  </TownDialog>
</template>
<script setup>
import { t } from '../i18n';
import TownDialog from './town/TownDialog.vue';
defineEmits(['cancel', 'depart']);
</script>
