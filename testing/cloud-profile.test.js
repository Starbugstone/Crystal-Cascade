import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { version as contentVersion } from '../backend/content/game.json';

const stores = vi.hoisted(() => ({ campaign: null, game: null, inventory: null }));
vi.mock('../src/stores/campaignStore', () => ({ useCampaignStore: () => stores.campaign }));
vi.mock('../src/stores/gameStore', () => ({ useGameStore: () => stores.game }));
vi.mock('../src/stores/inventoryStore', () => ({ useInventoryStore: () => stores.inventory }));
vi.mock('../src/i18n', () => ({ locale: { value: 'en' } }));

const prefix = 'prospect-cloud-command:';
let api;
let storage;
let fetchMock;
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function reply(value, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => structuredClone(value) };
}
function profile(playerId = 'account-a', revision = 0, run = null) {
  return {
    playerId,
    revision,
    contentVersion,
    linked: true,
    locale: 'en',
    run,
    profile: { town: { coins: revision }, records: {}, powers: [] },
  };
}
function memoryStorage() {
  const value = {};
  Object.defineProperties(value, {
    getItem: { value: (key) => value[key] ?? null },
    setItem: {
      value: (key, entry) => {
        value[key] = String(entry);
      },
    },
    removeItem: {
      value: (key) => {
        delete value[key];
      },
    },
    clear: {
      value: () => {
        for (const key of Object.keys(value)) delete value[key];
      },
    },
  });
  return value;
}

beforeEach(async () => {
  vi.resetModules();
  storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('location', { reload: vi.fn() });
  stores.campaign = {
    town: { coins: 0 },
    $patch: vi.fn(function (value) {
      Object.assign(this, value);
    }),
  };
  stores.game = {
    sessionActive: false,
    sessionVersion: 0,
    levelCleared: false,
    exitLevel: vi.fn(() => {
      stores.game.sessionActive = false;
      stores.game.sessionVersion++;
    }),
    $patch: vi.fn(function (value) {
      Object.assign(this, value);
    }),
  };
  stores.inventory = { availableQuantity: () => 0 };
  fetchMock = vi.fn(() => {
    throw new Error('Unexpected request');
  });
  vi.stubGlobal('fetch', fetchMock);
  api = await import('../src/services/cloudProfile');
  api.installCloudAdapters();
  Object.assign(api.cloud, { ready: true, playerId: 'account-a', csrf: 'csrf-a', revision: 0 });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cloud persistence and account boundaries', () => {
  it('persists the exact command before sending it and removes it only after success', async () => {
    storage.setItem('crystal-cascade-profile-v3', 'untouched local village');
    fetchMock.mockImplementation(async (url, options) => {
      expect(url).toBe('/api/v1/actions');
      const body = JSON.parse(options.body);
      expect(JSON.parse(storage.getItem(prefix + body.actionId))).toEqual({
        key: prefix + body.actionId,
        playerId: 'account-a',
        body,
      });
      expect(options.headers['X-Player-Id']).toBe('account-a');
      expect(options.headers['X-Content-Version']).toBe(contentVersion);
      expect(options.credentials).toBe('same-origin');
      return reply(profile('account-a', 1));
    });
    await api.command('preferences', { locale: 'fr' });
    expect(Object.keys(storage).filter((key) => key.startsWith(prefix))).toEqual([]);
    expect(storage.getItem('crystal-cascade-profile-v3')).toBe('untouched local village');
    expect(api.cloud.revision).toBe(1);
  });

  it.each([401, 403])(
    'retains a durable command after HTTP %i so reauthentication can recover it',
    async (status) => {
      fetchMock.mockResolvedValue(reply({ error: 'Sign in again.' }, status));
      await expect(api.command('preferences', { locale: 'fr' })).rejects.toMatchObject({ status });
      const pending = Object.keys(storage).filter((key) => key.startsWith(prefix));
      expect(pending).toHaveLength(1);
      expect(JSON.parse(storage.getItem(pending[0])).body.type).toBe('preferences');
      expect(api.cloud.pending).toBe(true);
      expect(api.cloud.revision).toBe(0);
    },
  );

  it('retries a lost response with the same action ID instead of creating another mutation', async () => {
    let original;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.endsWith('/profile')) return reply(profile('account-a', 1));
      const body = JSON.parse(options.body);
      if (!original) {
        original = body;
        throw new TypeError('Connection dropped after commit');
      }
      expect(body).toEqual(original);
      return reply(profile('account-a', 1));
    });
    await expect(api.command('preferences', { locale: 'fr' })).rejects.toThrow(
      'Connection dropped',
    );
    await api.retryPending();
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/actions'))).toHaveLength(2);
    expect(api.cloud.pending).toBe(false);
    expect(api.cloud.revision).toBe(1);
  });

  it('drains two queued actions under their original account before changing identity', async () => {
    const firstResponse = deferred();
    let switched = false;
    let sent = 0;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.endsWith('/profile')) {
        expect(switched).toBe(true);
        return reply(profile('account-b'));
      }
      expect(switched).toBe(false);
      expect(options.headers['X-Player-Id']).toBe('account-a');
      expect(options.headers['X-CSRF-Token']).toBe('csrf-a');
      sent++;
      return sent === 1 ? firstResponse.promise : reply(profile('account-a', 2));
    });
    const first = api.command('preferences', { locale: 'fr' });
    const second = api.command('preferences', { locale: 'en' });
    await vi.waitFor(() => expect(sent).toBe(1));
    const transition = api.changeAccount(async () => {
      switched = true;
      api.cloud.csrf = 'csrf-b';
    });
    expect(switched).toBe(false);
    firstResponse.resolve(reply(profile('account-a', 1)));
    await Promise.all([first, second, transition]);
    expect(sent).toBe(2);
    expect(api.cloud.playerId).toBe('account-b');
    expect(api.cloud.pending).toBe(false);
  });

  it('ignores an older refresh when a newer profile and run have already arrived', async () => {
    const oldResponse = deferred();
    fetchMock
      .mockReturnValueOnce(oldResponse.promise)
      .mockResolvedValueOnce(
        reply(profile('account-a', 2, { runId: 'new-run', status: 'active' })),
      );
    const oldRefresh = api.refresh();
    await api.refresh();
    oldResponse.resolve(reply(profile('account-a', 1, { runId: 'old-run', status: 'active' })));
    await oldRefresh;
    expect(api.cloud.revision).toBe(2);
    expect(stores.campaign.town.coins).toBe(2);
    expect(api.cloud.run.runId).toBe('new-run');
  });

  it('rejects a pre-transition response without restoring the previous account or CSRF token', async () => {
    const oldResponse = deferred();
    fetchMock
      .mockReturnValueOnce(oldResponse.promise)
      .mockResolvedValueOnce(reply({ ...profile('account-b'), csrf: 'csrf-b' }));
    const stale = api.refresh().catch((error) => error);
    await api.changeAccount(async () => {});
    oldResponse.resolve(reply({ ...profile('account-a', 99), csrf: 'csrf-a-old' }));
    expect(await stale).toBeInstanceOf(Error);
    expect(api.cloud.playerId).toBe('account-b');
    expect(api.cloud.csrf).toBe('csrf-b');
    expect(stores.campaign.town.coins).toBe(0);
  });

  it('keeps the destination account when an older tab response arrives after a shared-cookie account change', async () => {
    const oldResponse = deferred();
    const destinationRun = { runId: 'account-b-run', status: 'active' };
    api.cloud.run = { runId: 'account-a-run', status: 'active' };
    stores.game.sessionActive = true;
    stores.game.runId = 'account-a-run';
    fetchMock
      .mockReturnValueOnce(oldResponse.promise)
      .mockResolvedValueOnce(reply({ ...profile('account-b', 2, destinationRun), csrf: 'csrf-b' }));
    const stale = api.refresh().catch((error) => error);
    // Another tab changed the shared session cookie; no local changeAccount call occurs.
    await api.refresh();
    oldResponse.resolve(
      reply({
        ...profile('account-a', 99, { runId: 'old-account-a-run', status: 'active' }),
        csrf: 'csrf-a-old',
      }),
    );
    expect(await stale).toBeInstanceOf(Error);
    expect(api.cloud.playerId).toBe('account-b');
    expect(api.cloud.csrf).toBe('csrf-b');
    expect(api.cloud.revision).toBe(2);
    expect(stores.campaign.town.coins).toBe(2);
    expect(api.cloud.run).toEqual(destinationRun);
    expect(stores.game.sessionVersion).toBe(1);
    expect(stores.game.sessionActive).toBe(false);
  });

  it('ignores malformed pending entries without crashing bootstrap', async () => {
    storage.setItem(prefix + 'broken-json', '{');
    storage.setItem(prefix + 'missing-body', JSON.stringify({ playerId: 'account-a' }));
    storage.setItem(prefix + 'bad-shape', JSON.stringify({ playerId: 'account-a', body: null }));
    fetchMock.mockResolvedValue(reply(profile()));
    await expect(api.bootstrapCloud()).resolves.toBeUndefined();
    expect(api.cloud.ready).toBe(true);
    expect(api.cloud.pending).toBe(false);
    expect(fetchMock.mock.calls.every(([url]) => url.endsWith('/profile'))).toBe(true);
  });

  it('does not let a stored entry replace its actual storage key and masquerade as another pending command', async () => {
    const actionId = 'valid-action-id-123456789';
    storage.setItem(
      prefix + 'wrong-physical-key',
      JSON.stringify({
        key: prefix + actionId,
        playerId: 'account-a',
        body: { actionId, revision: 0, type: 'preferences', args: { locale: 'fr' } },
      }),
    );
    fetchMock.mockImplementation(async (url) => {
      expect(url).toBe('/api/v1/profile');
      return reply(profile());
    });
    await api.bootstrapCloud();
    expect(api.cloud.pending).toBe(false);
    expect(fetchMock.mock.calls.every(([url]) => url.endsWith('/profile'))).toBe(true);
  });

  it('coalesces simultaneous bootstrap calls so late guest cookies cannot race each other', async () => {
    const initialResponse = deferred();
    let calls = 0;
    fetchMock.mockImplementation(async (url) => {
      calls++;
      if (calls === 1) return initialResponse.promise;
      if (url.endsWith('/guests')) return reply({ csrf: 'guest-csrf' });
      return reply(profile('guest-account'));
    });
    api.cloud.ready = false;
    const first = api.bootstrapCloud();
    const second = api.bootstrapCloud();
    initialResponse.resolve(reply({ error: 'No session' }, 401));
    await Promise.all([first, second]);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/guests'))).toHaveLength(1);
    expect(api.cloud.playerId).toBe('guest-account');
  });
});
