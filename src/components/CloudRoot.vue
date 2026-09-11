<template>
  <aside ref="accountBar" class="cloud-bar" aria-label="Account and cloud save">
    <span role="status">{{ t(cloud.status) }}</span>
    <button v-if="cloud.pending" :disabled="cloud.busy" @click="retryPending">
      {{ t('Retry save') }}
    </button>
    <button
      v-if="cloud.run?.status === 'active' && !game.sessionActive"
      :disabled="cloud.busy"
      @click="resume"
    >
      {{ t('Resume mine') }}
    </button>
    <button
      v-if="cloud.run?.status === 'active' && !game.sessionActive"
      :disabled="cloud.busy"
      @click="abandon"
    >
      {{ t('Abandon mine') }}
    </button>
    <button @click="accountOpen = !accountOpen">
      {{ t(cloud.linked ? 'My account' : 'Save my progress') }}
    </button>
  </aside>
  <p v-if="cloud.error" class="cloud-error" role="alert">{{ cloud.error }}</p>
  <section v-if="accountOpen || token" class="cloud-account">
    <h1>{{ t('Your village, on every device') }}</h1>
    <p v-if="!cloud.linked">
      {{
        t(
          'Link an email to recover this village on your PC, tablet or phone. Guest progress cannot be recovered if you lose this browser’s cookies.',
        )
      }}
    </p>
    <form v-if="!token" @submit.prevent="sendLink(true)">
      <label
        >{{ t('Email address') }}
        <input v-model="email" type="email" autocomplete="email" required maxlength="254"
      /></label>
      <button :disabled="sending || cloud.busy || cloud.accountBusy || !cloud.ready">
        {{ t('Save this village to my email') }}
      </button>
      <button
        type="button"
        :disabled="sending || cloud.busy || cloud.accountBusy || !cloud.ready"
        @click="sendLink(false)"
      >
        {{ t('Sign in to an existing village') }}
      </button>
    </form>
    <div v-else>
      <p>{{ t('Confirm to use this sign-in link. It expires after 15 minutes.') }}</p>
      <button
        :disabled="sending || cloud.busy || cloud.accountBusy || !cloud.ready"
        @click="confirm(false)"
      >
        {{ t('Confirm sign-in') }}
      </button>
      <button
        v-if="conflict"
        :disabled="sending || cloud.busy || cloud.accountBusy || !cloud.ready"
        @click="confirm(true)"
      >
        {{ t('Use existing village') }}
      </button>
    </div>
    <p role="status">{{ message }}</p>
    <label v-if="cloud.ready"
      >{{ t('Language') }}
      <select :value="locale" :disabled="cloud.busy" @change="changeLanguage($event.target.value)">
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </label>
    <template v-if="cloud.linked">
      <button :disabled="cloud.busy || cloud.accountBusy" @click="logout(false)">
        {{ t('Sign out') }}
      </button>
      <button :disabled="cloud.busy || cloud.accountBusy" @click="logout(true)">
        {{ t('Sign out all devices') }}
      </button>
      <details>
        <summary>{{ t('Delete account') }}</summary>
        <p>{{ t('This permanently deletes the cloud village and all sessions.') }}</p>
        <label
          >{{ t('Type DELETE MY ACCOUNT to confirm') }}
          <input v-model="deleteConfirmation" autocomplete="off"
        /></label>
        <button
          :disabled="deleteConfirmation !== 'DELETE MY ACCOUNT' || sending"
          @click="deleteAccount"
        >
          {{ t('Delete my account and village') }}
        </button>
      </details>
    </template>
    <p>
      {{ t('Your old local village remains separate and unchanged.') }}
      <a href="?mode=demo">{{ t('Open local demo') }}</a>
    </p>
  </section>
  <App v-if="cloud.ready" />
  <section v-else class="cloud-account">
    <h1>Prospect Hollow</h1>
    <p>{{ t('Connecting to your village…') }}</p>
    <button @click="connect">{{ t('Retry connection') }}</button>
  </section>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import App from '../App.vue';
import {
  cloud,
  bootstrapCloud,
  command,
  request,
  retryPending,
  applyRun,
  changeAccount,
} from '../services/cloudProfile';
import { useGameStore } from '../stores/gameStore';
import { locale, t } from '../i18n';
const game = useGameStore();
const accountBar = ref(null);
let barObserver;
onMounted(() => {
  document.documentElement.classList.add('cloud-mode');
  barObserver = new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty(
      '--cloud-bar-height',
      `${entry.target.offsetHeight}px`,
    );
  });
  barObserver.observe(accountBar.value);
});
onUnmounted(() => {
  barObserver?.disconnect();
  document.documentElement.classList.remove('cloud-mode');
  document.documentElement.style.removeProperty('--cloud-bar-height');
});
const accountOpen = ref(false),
  email = ref(''),
  message = ref(''),
  sending = ref(false),
  conflict = ref(false),
  deleteConfirmation = ref('');
const token = ref('');
function readLoginProof() {
  const proof = new URLSearchParams(location.hash.slice(1)).get('login');
  if (!proof) return;
  token.value = proof;
  conflict.value = false;
  accountOpen.value = true;
  history.replaceState(null, '', location.pathname + location.search);
}
readLoginProof();
window.addEventListener('hashchange', readLoginProof);
onUnmounted(() => window.removeEventListener('hashchange', readLoginProof));
async function connect() {
  try {
    await bootstrapCloud();
    cloud.error = '';
  } catch (error) {
    cloud.error = error.message;
    cloud.status = 'Waiting for connection';
  }
}
async function sendLink(link = true) {
  sending.value = true;
  try {
    message.value = (await request('auth/login-link', { email: email.value, link })).message;
  } catch (e) {
    message.value = e.message;
  } finally {
    sending.value = false;
  }
}
async function confirm(useExisting) {
  sending.value = true;
  try {
    await changeAccount(() => request('auth/confirm', { token: token.value, useExisting }));
    token.value = '';
    conflict.value = false;

    cloud.ready = true;
    message.value = t('Signed in. Your village is saved.');
  } catch (e) {
    message.value = e.message;
    conflict.value = e.status === 409;
  } finally {
    sending.value = false;
  }
}
async function logout(all) {
  try {
    await changeAccount(() => request(all ? 'auth/revoke-all' : 'auth/logout', {}), true);
  } catch (error) {
    message.value = error.message;
  }
}
async function changeLanguage(value) {
  try {
    await command('preferences', { locale: value });
  } catch {
    /* displayed in save bar */
  }
}
async function resume() {
  try {
    const result = await command('run.resume', { runId: cloud.run.runId });
    applyRun(result.run);
  } catch {
    /* displayed in save bar */
  }
}
async function abandon() {
  try {
    await command('run.abandon', { runId: cloud.run.runId });
    cloud.run = null;
  } catch {
    /* displayed in save bar */
  }
}
async function deleteAccount() {
  sending.value = true;
  try {
    await changeAccount(
      () => request('account', { confirmation: deleteConfirmation.value }, 'DELETE'),
      true,
    );
  } catch (e) {
    message.value = e.message;
  } finally {
    sending.value = false;
  }
}
connect();
</script>
<style>
.cloud-mode .town-map-frame.town-fullscreen {
  top: var(--cloud-bar-height, 64px);
  height: calc(100dvh - var(--cloud-bar-height, 64px));
}
.cloud-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 0.65rem 1rem;
  background: #152a2d;
  color: #fff;
  font: 500 0.9rem system-ui;
  position: sticky;
  top: 0;
  z-index: 95;
}
.cloud-bar button,
.cloud-account button {
  background: #ffdc99;
  color: #192c2b;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.65rem 1rem;
  cursor: pointer;
  font: inherit;
}
.cloud-bar button:disabled,
.cloud-account button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.cloud-account {
  position: fixed;
  top: var(--cloud-bar-height, 64px);
  left: 0;
  right: 0;
  z-index: 96;
  max-height: calc(100dvh - var(--cloud-bar-height, 64px) - 2rem);
  overflow-y: auto;
  max-width: 48rem;
  margin: 1rem auto;
  padding: 1.5rem;
  border-radius: 1rem;
  background: #fff9ec;
  color: #223431;
  font: 1rem/1.5 system-ui;
}
.cloud-account form,
.cloud-account label {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
  margin: 0.75rem 0;
}
.cloud-account input,
.cloud-account select {
  max-width: 100%;
  padding: 0.7rem;
  border: 1px solid #78918a;
  border-radius: 0.4rem;
  font: inherit;
  background: white;
  color: #223431;
}
.cloud-account button {
  margin: 0.3rem;
}
.cloud-error {
  margin: 0;
  padding: 0.7rem 1rem;
  background: #fff0d9;
  color: #782d10;
  position: relative;
  z-index: 51;
}
</style>
