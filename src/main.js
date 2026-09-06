import { createApp, watch } from 'vue';
import { locale, browserLocale } from './i18n';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/base.css';
import './styles/theme.css';
import './styles/arcade.css';
import './styles/mine.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
const languageChanged = () => {
  locale.value = browserLocale();
};
const stopLanguageWatch = watch(
  locale,
  (language) => {
    document.documentElement.lang = language;
  },
  { immediate: true },
);
window.addEventListener('languagechange', languageChanged);
app.onUnmount(() => {
  window.removeEventListener('languagechange', languageChanged);
  stopLanguageWatch();
});
app.mount('#app');
