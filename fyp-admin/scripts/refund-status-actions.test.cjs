// Run with node --test scripts/refund-status-actions.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = path.join(__dirname, '../components/RefundStatusActions.tsx');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(code, { module: mod, exports: mod.exports, require: name => name === 'next/navigation' ? { useRouter: () => ({ refresh() {} }) } : require(name) });
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
