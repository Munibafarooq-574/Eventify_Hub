const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const alice = { _id: '507f191e810c19729de860ea' };
const bob = { _id: '507f191e810c19729de860eb' };
const cart = JSON.stringify({ vendors: [{ vendorId: 'private-cart-item' }] });
const event = JSON.stringify({ eventId: 'private-event' });
const source = ts.transpileModule(fs.readFileSync('store/index.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function fixture(platform = 'android') {
  const secure = new Map([['cartData', 'shared-cart'], ['eventDetails', 'shared-event']]);
  const users = new Map();
  let remindersCancelled = 0;
  let beforeRead = async () => {};
  const load = () => {
    const exports = {};
    const imports = {
      'react-native': { Platform: { OS: platform } },
      'expo-secure-store': {
        getItemAsync: async key => { await beforeRead(key); return secure.get(key) ?? null; },
        setItemAsync: async (key, value) => secure.set(key, value),
        deleteItemAsync: async key => secure.delete(key),
      },
      '@react-native-async-storage/async-storage': { default: {
        getItem: async key => users.get(key),
        setItem: async (key, value) => users.set(key, value),
        removeItem: async key => users.delete(key),
      } },
      '../services/cartReminder': { cancelCartReminder: async () => { remindersCancelled++; } },
    };
    vm.runInNewContext(source, { exports, require: name => imports[name], localStorage: {
      getItem: key => secure.get(key) ?? null,
      setItem: (key, value) => secure.set(key, value),
      removeItem: key => secure.delete(key),
    } });
    return exports;
  };
  return { load, secure, users, setReadHook: hook => { beforeRead = hook; }, reminderCount: () => remindersCancelled };
}

for (const platform of ['android', 'web']) {
  test(`${platform}: A → B → A isolates drafts and drops old shared data, including after restart`, async () => {
    const { load, secure, users, reminderCount } = fixture(platform);
    users.set('user', JSON.stringify(alice));
    secure.set('token', 'alice-token');
    const store = load();
    assert.equal(await store.getSecureData('cartData'), null);
    assert.equal(await store.getSecureData('eventDetails'), null);

    await store.startUserSession('alice-token', alice);
    const oldScreen = store.createBookingDraftStore();
    await oldScreen.save('cartData', cart);
    await oldScreen.save('eventDetails', event);
    const logout = store.deleteUserData();
    const pendingWrite = oldScreen.save('cartData', 'stale-write');
    await Promise.all([logout, pendingWrite]);

    await store.startUserSession('bob-token', bob);
    await oldScreen.save('eventDetails', 'stale-event');
    assert.equal(await oldScreen.get('cartData'), null);
    assert.equal(await store.getSecureData('cartData'), null);
    assert.equal(await load().getSecureData('eventDetails'), null);

    await store.startUserSession('alice-token', alice);
    await oldScreen.delete('cartData');
    const restarted = load();
    assert.equal(await restarted.getSecureData('cartData'), cart);
    assert.equal(await restarted.getSecureData('eventDetails'), event);
    assert.ok(reminderCount() >= 3);
  });
}


test('a draft write paused before logout cannot resume under another account', async () => {
  const { load, setReadHook } = fixture();
  const store = load();
  await store.startUserSession('alice-token', alice);
  const draft = store.createBookingDraftStore();
  await draft.save('eventDetails', event);

  let resume;
  let markPaused;
  const paused = new Promise(resolve => { markPaused = resolve; });
  setReadHook(async key => {
    if (key === `booking-draft.${alice._id}.eventDetails`) {
      await new Promise(resolve => { resume = resolve; markPaused(); });
    }
  });
  const write = draft.save('eventDetails', JSON.stringify({ eventId: 'stale-event' }));
  await paused;
  const logout = store.deleteUserData();
  const login = store.startUserSession('bob-token', bob);
  resume();
  await Promise.all([write, logout, login]);

  assert.equal(await store.getSecureData('eventDetails'), null);
  setReadHook(async () => {});
  await store.startUserSession('alice-token', alice);
  assert.equal(await store.getSecureData('eventDetails'), event);
});
