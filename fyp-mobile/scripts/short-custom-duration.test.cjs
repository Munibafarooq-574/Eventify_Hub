const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('components/vendorprofiledetails(orginzer)/VendorProfileDetailsIndex.tsx', 'utf8');
const pricingSource = fs.readFileSync('utils/resolvePackagePrice.ts', 'utf8');
const code = ts.transpileModule(pricingSource.replace('export const', 'const') + '\nresolvePackagePrice;', {}).outputText;
const resolve = vm.runInNewContext(code);
const pricing = {
  price: 15000, baseIncludedDurationMinutes: 120,
  durations: [{ value: 3, unit: 'HOURS', price: 20000 }],
  allowCustomDuration: true, customDurationUnit: 'HOURS', customDurationRate: 6000,
};

test('the add-to-cart quote uses the hourly rate below the base duration', () => {
  assert.equal(resolve(pricing, 60).price, 6000);
  assert.equal(resolve(pricing, 60).basis, 'custom');
  assert.equal(resolve(pricing, 120).price, 15000);
  assert.equal(resolve(pricing, 180).price, 20000);
  assert.equal(resolve(pricing, 240).price, 27000);
});

test('the short quote requires valid vendor custom pricing and preserves price ordering', () => {
  assert.equal(resolve({ ...pricing, allowCustomDuration: false }, 60).price, null);
  assert.equal(resolve(pricing, 90).price, null);
  assert.equal(resolve({ ...pricing, customDurationRate: 18000 }, 60).price, 15000);
});

test('package cards and the Add to Cart footer show the same selected-duration quote', () => {
  assert.match(source, /const durationQuote = getEventDurationQuote\(pkg\)/);
  assert.match(source, /durationQuote\?\.price \?\? pkg\.price/);
  assert.match(source, /const selectedDurationQuote = getEventDurationQuote\(selectedPackage\)/);
  assert.match(source, /selectedDurationQuote\?\.price \?\? selectedPackage\.price/);
  assert.match(source, /const cartDisabled = selectedDurationQuote\?\.price === null/);
});
