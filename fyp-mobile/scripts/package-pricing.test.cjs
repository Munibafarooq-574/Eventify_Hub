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

test('Mehndi only permits eligible headcount and calculates group or per-person totals', () => {
  assert.equal(pricing.isMehndiCategory({ businessDetailsType: 'MEHNDI' }), true);
  assert.equal(pricing.isMehndiCategory({ name: 'Catering' }), false);
  const group = { pricingMethod:'GROUP', groupSize:6, price:230 };
  assert.equal(pricing.mehndiServiceQuantity(group,6),1);
  assert.equal(pricing.mehndiServiceQuantity(group,15),null);
  const configured = { ...group, maxServicePeople:15 };
  const quantity = pricing.mehndiServiceQuantity(configured,15);
  assert.equal(quantity,3);
  assert.equal(pricing.packageAmount({...configured,quantity},15),690);
  const perPerson = { pricingMethod:'PER_PERSON', maxServicePeople:15, price:15, personCount:6 };
  assert.equal(pricing.mehndiServiceQuantity(perPerson,6),1);
  assert.equal(pricing.packageAmount(perPerson,15),90);
  assert.equal(pricing.mehndiServiceQuantity(perPerson,16),null);
});
