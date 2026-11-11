const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const pricing = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/packagePricing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: pricing });

test('new fixed catering and per-person makeup use the saved method', () => {
  assert.equal(pricing.packageAmount({ pricingMethod: 'FIXED', price: 12000, quantity: 2 }, 100, true), 24000);
  assert.equal(pricing.packageAmount({ pricingMethod: 'PER_PERSON', price: 3000, personCount: 5 }, 100), 15000);
});
test('group capacity describes serving while quantity determines the price', () => {
  const pkg = { pricingMethod: 'GROUP', price: 12000, quantity: 2, groupSize: 10 };
  assert.equal(pricing.packageAmount(pkg, 100), 24000);
  assert.equal(pricing.pricingLabel(pkg), 'per group · serves 10 people');
});
test('old carts retain catering multiplication, and new participant counts override event guests', () => {
  assert.equal(pricing.packageAmount({ price: 1500, quantity: 1 }, 100, true), 150000);
  assert.equal(pricing.packageAmount({ pricingMethod: 'PER_PERSON', price: 1500, personCount: 50 }, 100, true), 75000);
});
