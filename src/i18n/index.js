import { ref } from 'vue';
import fr from './fr.json';

export function browserLocale(
  languages = globalThis.navigator?.languages ?? [globalThis.navigator?.language],
) {
  for (const language of languages ?? []) {
    const base = String(language ?? '')
      .toLowerCase()
      .split('-')[0];
    if (base === 'en' || base === 'fr') return base;
  }
  return 'en';
}
export const locale = ref(browserLocale());
// A future account preference can use the same boundary without touching views.
export function setLocale(language) {
  locale.value = browserLocale([language]);
}
export function t(message, values = {}) {
  if (typeof message !== 'string') return message;
  const translated = locale.value === 'fr' && Object.hasOwn(fr, message) ? fr[message] : message;
  return translated.replace(/\{(\w+)\}/g, (token, key) => values[key] ?? token);
}
export const number = (value) => new Intl.NumberFormat(locale.value).format(value);
