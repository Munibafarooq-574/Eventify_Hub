const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const alice = { _id: '507f191e810c19729de860ea' };
const bob = { _id: '507f191e810c19729de860eb' };
const event = { eventId: 'private-event' };
const cart = { vendors: [{ vendorId: 'private-cart-item' }] };
const source = ts.transpileModule(fs.readFileSync('store/index.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function device(server, platform = 'android') {
  const secure = new Map([['cartData', 'shared-cart'], ['eventDetails', 'shared-event']]);
  const users = new Map();
  let beforeRequest = async () => {};
  function load() {
    const exports = {};
    const imports = {
      'react-native': { Platform: { OS: platform } },
      'expo-secure-store': {
        getItemAsync: async key => secure.get(key) ?? null,
        setItemAsync: async (key, value) => secure.set(key, value),
        deleteItemAsync: async key => secure.delete(key),
      },
      '@react-native-async-storage/async-storage': { __esModule: true, default: {
        getItem: async key => users.get(key),
        setItem: async (key, value) => users.set(key, value),
        removeItem: async key => users.delete(key),
      } },
      '../services/cartReminder': { cancelCartReminder: async () => {} },
      '../services/apiConfig': { API_BASE_URL: 'https://example.invalid' },
    };
    vm.runInNewContext(source, { exports, require: name => /currency/.test(name) ? require('./test-currency.cjs') : imports[name], localStorage: {
      getItem: key => secure.get(key) ?? null,
      setItem: (key, value) => secure.set(key, value),
      removeItem: key => secure.delete(key),
    }, AbortController, setTimeout, clearTimeout, fetch: async (url, options) => {
      assert.match(url, /\/booking-draft$/);
      const owner = options.headers.Authorization;
      await beforeRequest(options);
      const previous = server.get(owner) ?? { revision: 0, eventDetails: null, cartData: null };
      if (options.method === 'GET') return { ok: true, json: async () => previous };
      const { revision, key, value } = JSON.parse(options.body);
      if (revision !== previous.revision) return { ok: false, status: 409, json: async () => ({ message: 'Draft changed' }) };
      const next = { ...previous, revision: revision + 1, ...(key === 'legacyDraft' ? value : { [key]: value }) };
      server.set(owner, next);
      return { ok: true, json: async () => next };
    } });
    return exports;
  }
  return { load, secure, pauseRequests: hook => { beforeRequest = hook; } };
}

test('cart and event sync to another device for the same account and stay out of device storage', async () => {
  const server = new Map();
  const first = device(server);
  const second = device(server, 'web');
  const a = first.load(), b = second.load();
  await a.startUserSession('alice-token', alice);
  assert.equal(await a.getSecureData('cartData'), null);
  const draft = a.createBookingDraftStore();
  await draft.save('eventDetails', JSON.stringify(event));
  await draft.save('cartData', JSON.stringify(cart));
  await b.startUserSession('alice-token', alice);
  assert.equal(await b.getSecureData('cartData'), JSON.stringify(cart));
  assert.equal(await second.load().getSecureData('eventDetails'), JSON.stringify(event));
  assert.ok(![...first.secure.keys(), ...second.secure.keys()].some(key => /cartData|eventDetails/.test(key)));
  await b.deleteUserData();
  await b.startUserSession('bob-token', bob);
  assert.equal(await b.getSecureData('cartData'), null);
  assert.equal(await b.getSecureData('eventDetails'), null);
});

test('a stale cart edit cannot overwrite the newer device version', async () => {
  const server = new Map();
  const a = device(server).load(), b = device(server).load();
  await Promise.all([a.startUserSession('alice-token', alice), b.startUserSession('alice-token', alice)]);
  const first = a.createBookingDraftStore(), second = b.createBookingDraftStore();
  await first.save('eventDetails', JSON.stringify(event));
  await second.get('cartData');
  await first.save('cartData', JSON.stringify(cart));
  await assert.rejects(second.save('cartData', JSON.stringify({ vendors: [] })), /Draft changed/);
  assert.equal(await second.get('cartData'), JSON.stringify(cart));
});

test('a draft write paused before logout cannot resume under another account', async () => {
  const first = device(new Map());
  const store = first.load();
  await store.startUserSession('alice-token', alice);
  let resume, markPaused;
  const paused = new Promise(resolve => { markPaused = resolve; });
  first.pauseRequests(async ({ method }) => {
    if (method === 'GET') await new Promise(resolve => { resume = resolve; markPaused(); });
  });
  const write = store.createBookingDraftStore().save('eventDetails', JSON.stringify(event));
  await paused;
  const logout = store.deleteUserData();
  const login = store.startUserSession('bob-token', bob);
  resume();
  await Promise.all([write, logout, login]);
  first.pauseRequests(async () => {});
  assert.equal(await store.getSecureData('eventDetails'), null);
  await store.startUserSession('alice-token', alice);
  assert.equal(await store.getSecureData('eventDetails'), null);
});


test('the original phone uploads an account-bound old cart once and a second phone receives it', async () => {
  const server = new Map();
  const first = device(server);
  const second = device(server);
  const a = first.load(), b = second.load();
  const cartKey = `booking-draft.${alice._id}.cartData`;
  const eventKey = `booking-draft.${alice._id}.eventDetails`;
  first.secure.set(cartKey, JSON.stringify(cart));
  first.secure.set(eventKey, JSON.stringify(event));
  await b.startUserSession('alice-token', alice);
  assert.equal(await b.getSecureData('cartData'), null);
  await a.startUserSession('alice-token', alice);
  assert.equal(await a.getSecureData('cartData'), JSON.stringify(cart));
  assert.equal(await b.getSecureData('cartData'), JSON.stringify(cart));
  assert.equal(await b.getSecureData('eventDetails'), JSON.stringify(event));
  assert.equal(server.get('Bearer alice-token').revision, 1);
  assert.ok(!first.secure.has(cartKey) && !first.secure.has(eventKey));
});

test('an old phone cart never replaces an existing server cart', async () => {
  const server = new Map([['Bearer alice-token', { revision: 5, cartData: null, eventDetails: null }]]);
  const first = device(server);
  first.secure.set(`booking-draft.${alice._id}.cartData`, JSON.stringify(cart));
  first.secure.set(`booking-draft.${alice._id}.eventDetails`, JSON.stringify(event));
  const store = first.load();
  await store.startUserSession('alice-token', alice);
  assert.equal(await store.getSecureData('cartData'), null);
  assert.equal(server.get('Bearer alice-token').revision, 5);
});
