<template>
  <dialog
    ref="dialog"
    class="town-dialog"
    :aria-label="title"
    @cancel.prevent="$emit('close')"
    @click="dismissBackdrop"
  >
    <header class="town-dialog-heading">
      <span>{{ title }}</span>
      <button
        ref="closeButton"
        class="town-dialog-close"
        :aria-label="t(closeLabel)"
        @click="$emit('close')"
      >
        ×
      </button>
    </header>
    <div class="town-dialog-content"><slot /></div>
  </dialog>
</template>
<script setup>
import { useNativeDialog } from '../../composables/useNativeDialog';
import { t } from '../../i18n';
defineProps({ title: String, closeLabel: { type: String, default: 'Close building details' } });
const emit = defineEmits(['close']);
const { dialog, closeButton, dismissBackdrop } = useNativeDialog(() => emit('close'));
</script>
