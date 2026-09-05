export const SAVE_KEY = 'crystal-cascade-profile-v2';
export const LEGACY_SAVE_KEY = 'crystal-cascade-campaign-v1';

// The local adapter is the only storage boundary. The Symfony follow-up can replace it.
export const localProfile = {
  load() {
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
      // Keep the legacy key untouched as a migration backup.
      return { data: JSON.parse(storage.getItem(LEGACY_SAVE_KEY) ?? 'null') };
    } catch {
      return {
        data: null,
        warning: 'Your save could not be read. Progress will stay in this session.',
        readOnly: true,
      };
    }
  },
  save(data) {
    try {
      if (!globalThis.localStorage) return false;
      globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};
