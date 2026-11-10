const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../utils/currency.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
module.exports=api;

if (require.main === module) {
  const assert = require('node:assert/strict');
  api.setProfileCurrency('US');
  assert.equal(api.vendorDisplayCurrency({ price: 200 }), 'USD');
  assert.equal(api.formatMoney(200, api.vendorDisplayCurrency({ price: 200 })), '$ 200.00');
  assert.equal(api.vendorDisplayCurrency({ currency: 'PKR', price: 200 }), 'PKR');
  assert.equal(api.vendorDisplayCurrency({ currency: 'USD', price: 200 }), 'USD');
  assert.equal(api.currencyOf({ price: 200 }), 'PKR'); // Existing booking snapshot policy unchanged.
  api.setProfileCurrency('PK');
  assert.equal(api.vendorDisplayCurrency({ price: 200 }), 'PKR');
  assert.equal(api.formatMoney(200, api.vendorDisplayCurrency({ price: 200 })), 'Rs. 200');
  api.setProfileCurrency(null);
  console.log('Vendor country currency regression tests passed');
}
