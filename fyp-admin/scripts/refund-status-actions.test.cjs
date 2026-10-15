// Run with node --test scripts/refund-status-actions.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const helperFile = path.join(__dirname, '../lib/api-error.ts');
const helperModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(helperFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helperModule.exports, module: helperModule });
const file = path.join(__dirname, '../components/RefundStatusActions.tsx');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(code, { module: mod, exports: mod.exports, require: name => name === '@/lib/api-error' ? helperModule.exports : name === 'next/navigation' ? { useRouter: () => ({ refresh() {} }) } : require(name) });
const render = (amount, status) => renderToStaticMarkup(React.createElement(mod.exports.default, { refundId: 'test-refund', refundAmount: amount, currentStatus: status }));
for (const status of ['PENDING', 'PROCESSING', 'REJECTED']) {
  test(`zero refund ${status} offers closure without payment actions`, () => {
    const html = render(0, status); assert.match(html, /Close case/); assert.match(html, /No refund due/);
    assert.doesNotMatch(html, /Confirm Refunded|Start Processing|>Reject</);
  });
}
test('closed zero refund makes no settlement claim and offers no mutation', () => {
  const html = render(0, 'NO_REFUND_DUE'); assert.match(html, /No money returned/); assert.doesNotMatch(html, /<button/);
});
test('positive refund keeps its existing review and settlement actions', () => {
  assert.match(render(1000, 'PENDING'), /Start Processing/);
  assert.match(render(1000, 'PROCESSING'), /Confirm Refunded/);
  assert.match(render(1000, 'REFUNDED'), /Settlement confirmed/);
  assert.doesNotMatch(render(1000, 'PROCESSING'), /Close case/);
});

test('nested production validation errors display text instead of object Object', () => {
  const { apiErrorMessage } = helperModule.exports;
  assert.equal(apiErrorMessage({ statusCode: 400, message: { statusCode: 400, message: ['status is invalid', 'Reload the backend'], error: 'Bad Request' } }), 'status is invalid Reload the backend');
  assert.equal(apiErrorMessage({ message: { message: 'Refund changed. Refresh before updating it.' } }), 'Refund changed. Refresh before updating it.');
  assert.equal(apiErrorMessage({ unrelated: true }, 'Please retry'), 'Please retry');
});
test('close button shows the actual HTTP error and allows retry after failure', async () => {
  const alerts = []; const states = []; let payload;
  const isolated = { exports: {} };
  vm.runInNewContext(code, { exports: isolated.exports, module: isolated,
    require: name => name === '@/lib/api-error' ? helperModule.exports
      : name === 'react' ? { useState: () => [null, value => states.push(value)] }
      : name === 'next/navigation' ? { useRouter: () => ({ refresh() { throw new Error('Must not refresh on error'); } }) } : require(name),
    window: { confirm: () => true, alert: message => alerts.push(message) },
    fetch: async (_url, options) => { payload = JSON.parse(options.body); return { ok: false, status: 409, json: async () => ({ message: { message: 'Refund changed. Refresh before updating it.' } }) }; },
  });
  const element = isolated.exports.default({ refundId: 'test-refund', refundAmount: 0, currentStatus: 'PROCESSING' });
  await element.props.children[1].props.onClick();
  assert.equal(payload.status, 'NO_REFUND_DUE'); assert.deepEqual(states, ['NO_REFUND_DUE', null]);
  assert.deepEqual(alerts, ['Refund update failed (HTTP 409): Refund changed. Refresh before updating it.']);
});
