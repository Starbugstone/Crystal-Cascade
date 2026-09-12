import { cloudEnabled } from './cloudMode';
// This release starts a new progress generation once. Keep this key stable in later releases.
// Earlier v1/v2 profiles are deliberately not imported, including writes from old open tabs.
export const SAVE_KEY = 'crystal-cascade-profile-v3';

// This adapter is the progress storage boundary. The Symfony follow-up can replace it.
export const localProfile = {
  load() {
    if (cloudEnabled) return { data: null };
    try {
      const storage = globalThis.localStorage;
      if (!storage)
        return { data: null, warning: 'Progress can only be kept until this page closes.' };
      const current = storage.getItem(SAVE_KEY);
      if (current != null) {
        const data = JSON.parse(current);
        if (data?.schemaVersion > 2)
          return {
            data,
            readOnly: true,
            warning: 'This save needs a newer version of the game. Your saved copy is safe.',
          };
        return { data };
      }
      return { data: null };
    } catch {
      return {
        data: null,
        warning: 'Your save could not be read. Progress will stay in this session.',
        readOnly: true,
      };
    }
  },
  save(data) {
    if (cloudEnabled) return false;
    try {
      if (!globalThis.localStorage) return false;
      globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};
