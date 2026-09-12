<template>
  <section class="community-settings" :aria-label="t('Public village')">
    <h2>{{ t('Public village') }}</h2>
    <p>
      {{
        t(
          'Your save is private. Opt in to share your village’s appearance and progression with other players.',
        )
      }}
    </p>
    <p v-if="!cloud.linked">{{ t('Link your email above before joining the leaderboard.') }}</p>
    <form v-else @submit.prevent="save">
      <label
        >{{ t('Public village name')
        }}<input v-model="name" required minlength="2" maxlength="40" autocomplete="off"
      /></label>
      <label
        ><input v-model="listed" type="checkbox" />{{
          t('Show my village on the leaderboard and allow read-only visits')
        }}</label
      >
      <p>{{ t('Your email, coins, inventory and active mine are never shared.') }}</p>
      <button :disabled="cloud.busy || cloud.pending || cloud.accountBusy || saving">
        {{ t('Save public village settings') }}
      </button>
      <p role="status">{{ message }}</p>
    </form>
  </section>
</template>
<script setup>
import { ref, watch } from 'vue';
import { cloud, command } from '../../services/cloudProfile';
import { t } from '../../i18n';
const name = ref(''),
  listed = ref(false),
  saving = ref(false),
  message = ref('');
watch(
  () => [cloud.playerId, cloud.community.villageName, cloud.community.listed],
  () => {
    name.value = cloud.community.villageName;
    listed.value = cloud.community.listed;
    message.value = '';
  },
  { immediate: true },
);
async function save() {
  saving.value = true;
  try {
    await command('community.preferences', {
      listed: listed.value,
      villageName: name.value.trim(),
    });
    message.value = t(
      listed.value
        ? 'Your village is now open for visits.'
        : 'Your village is hidden from the leaderboard and visits.',
    );
  } catch (error) {
    message.value = error.message;
  } finally {
    saving.value = false;
  }
}
</script>
<style scoped>
.community-settings {
  border-top: 1px solid #d4ccb9;
  margin-top: 1.25rem;
  padding-top: 0.5rem;
}
.community-settings form {
  display: block;
}
.community-settings input[type='checkbox'] {
  width: 1.2rem;
  height: 1.2rem;
}
</style>
