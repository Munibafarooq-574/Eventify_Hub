// Run with: node --test scripts/client-cancellation-api.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(name, token = 'session-token') {
  const calls = [];
  const axios = Object.assign(async config => { calls.push(config); return { data: { ok: true } }; }, {
    get: async (url, config) => { calls.push({ ...config, method: 'GET', url }); return { data: { eligible: true } }; },
    patch: async (url, data, config) => { calls.push({ ...config, method: 'PATCH', url, data }); return { data: { ok: true } }; },
  });
  const file = path.join(__dirname, '../services', `${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console, require: dependency => {
    if (dependency === 'axios') return axios;
    if (dependency === '../store') return { getSecureData: async key => { assert.equal(key, 'token'); return token; } };
    throw new Error(`Unexpected dependency: ${dependency}`);
  } }, { filename: file });
  return { api: module.exports, calls };
}
for (const name of ['calculateRefund', 'cancelConfirmedBooking', 'cancelBookingRequest', 'getVendorPenalty']) {
  test(`${name} sends no request without a signed-in token`, async () => {
    const { api, calls } = load(name, null);
    await assert.rejects(api.default('booking', 'organizer'), /sign in again/i); assert.equal(calls.length, 0);
  });
}
test('preview is an authenticated GET and performs no cancellation', async () => {
  const { api, calls } = load('calculateRefund'); await api.default('booking/id');
  assert.equal(calls.length, 1); assert.equal(calls[0].method, 'GET'); assert.equal(calls[0].headers.Authorization, 'Bearer session-token');
  assert.match(calls[0].url, /booking%2Fid\/calculate-refund$/); assert.equal(calls[0].data, undefined);
});
test('client confirmation requires preview and sends no financial values or owner ID', async () => {
  const { api, calls } = load('cancelConfirmedBooking');
  await assert.rejects(api.default('booking', 'organizer'), /Review the cancellation/); assert.equal(calls.length, 0);
  await api.default('booking', 'organizer', 'Plans changed', 'signed-preview');
  assert.equal(calls[0].method, 'PATCH'); assert.equal(calls[0].headers.Authorization, 'Bearer session-token');
  assert.deepEqual(Object.keys(calls[0].data).sort(), ['previewToken', 'reason']); assert.equal(calls[0].data.previewToken, 'signed-preview');
});
test('vendor helper preserves its existing payload while authenticating', async () => {
  const { api, calls } = load('cancelConfirmedBooking'); await api.default('booking', 'vendor', 'Unavailable');
  assert.match(calls[0].url, /vendor-cancel-confirmed$/); assert.deepEqual(Object.keys(calls[0].data), ['reason']);
  assert.equal(calls[0].headers.Authorization, 'Bearer session-token');
});
test('legacy vendor status helper authenticates before its backend ownership check', async () => {
  const { api, calls } = load('patchUpdateOrderStatus'); await api.patchUpdateVendorOrderStatus('booking', 'completed');
  assert.equal(calls[0].headers.Authorization, 'Bearer session-token'); assert.equal(calls[0].data.status, 'completed');
});

for (const [actor, expected] of [['organizer', 'Client'], ['client', 'Client'], ['vendor', 'Vendor'], ['admin', 'Admin'], [undefined, 'Not recorded']]) {
  test(`cancellation history identifies ${actor || 'missing actor'} without guessing`, () => {
    const { api } = load('../utils/bookingCancellation');
    const details = api.bookingCancellation({ status: 'cancelled', cancelledBy: actor, cancellationReason: '  Testing purpose  ', cancelledAt: '2030-01-01T12:00:00Z' });
    assert.equal(details.cancelledBy, expected); assert.equal(details.reason, 'Testing purpose'); assert.notEqual(details.cancelledAt, 'Not recorded');
  });
}
test('legacy vendor cancellation and absent reason/time remain explicit', () => {
  const { api } = load('../utils/bookingCancellation');
  const details = api.bookingCancellation({ status: 'cancelled_by_vendor', cancellationReason: ' ', cancelledAt: 'invalid' });
  assert.equal(details.cancelledBy, 'Vendor'); assert.equal(details.reason, 'No reason provided'); assert.equal(details.cancelledAt, 'Not recorded');
  assert.equal(api.bookingCancellation({ status: 'pending' }), null);
});
