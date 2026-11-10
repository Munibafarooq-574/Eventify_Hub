const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function source(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
const events = source('components/vendormyevents/VendorMyEventsIndex.tsx');
const summary = source('components/vendorordersummary/VendorOrderSummaryIndex.tsx');
test('tapping an event opens its parent order in Order Summary', () => {
  let handler;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(events) === 'onPress' &&
        node.initializer?.getText(events).includes('pathname: "/vendorordersummary"')) {
      handler = node.initializer.expression.getText(events);
    }
    ts.forEachChild(node, visit);
  }
  visit(events);
  assert.ok(handler);
  let destination;
  vm.runInNewContext(ts.transpileModule('(' + handler + ')()', {}).outputText, {
    id: 'selected-order', router: { push: value => { destination = value; } },
  });
  assert.equal(destination.pathname, '/vendorordersummary');
  assert.equal(destination.params.orderId, 'selected-order');
});
test('target order is visible first without duplicating or dropping other bookings', () => {
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(summary) === 'filteredOrders') {
      expression = node.initializer.getText(summary);
    }
    ts.forEachChild(node, visit);
  }
  visit(summary);
  const orders = Array.from({ length: 15 }, (_, i) => ({ _id: String(i) }));
  const run = (targetId) => {
    const exports = {};
    vm.runInNewContext(ts.transpileModule('exports.result = ' + expression, {}).outputText, {
      exports, orders, selectedFilter: 'All', fullyPaidOrders: [], targetId, useMemo: fn => fn(),
    });
    return exports.result;
  };
  const targeted = run('14');
  assert.equal(targeted[0]._id, '14');
  assert.equal(new Set(targeted.map(order => order._id)).size, 15);
  assert.deepEqual(Array.from(run(undefined), order => order._id), orders.map(order => order._id));
});
