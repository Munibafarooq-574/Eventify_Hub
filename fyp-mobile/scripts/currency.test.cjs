const {test}=require('node:test'),assert=require('node:assert/strict');
const money=require('./test-currency.cjs');
test('USA uses USD, Pakistan uses PKR, and logout clears the previous account currency',()=>{
  money.setProfileCurrency('US'); assert.equal(money.currencySymbol(),'$');
  money.setProfileCurrency('PK'); assert.equal(money.currencySymbol(),'Rs.');
  money.setProfileCurrency(null); assert.equal(money.currentCurrency(),'PKR');
});
test('historical prices never inherit a USA profile currency',()=>{
  money.setProfileCurrency('US'); assert.equal(money.currencySymbol(money.currencyOf({})),'Rs.');
  assert.equal(money.formatMoney(200,{currency:'USD'}),'$ 200.00');
  assert.equal(money.formatMoney(200,{eventCityId:{countryCode:'US'}}),'Rs. 200');
});
test('USD fixed, per-person and partial-payment amounts preserve cents',()=>{
  assert.equal(money.roundForCurrency(200.25*.2,'USD'),40.05);
  assert.equal(money.formatMoney(160.2,'USD'),'$ 160.20');
  assert.equal(money.roundForCurrency(19.99*3,'USD'),59.97);
});
test('one USD cart stays USD, mixed and legacy PKR/USD carts cannot submit',()=>{
  const cart={vendors:[{packages:[{currency:'USD',price:200},{currency:'USD',price:50}]}]};
  assert.equal(money.cartCurrency(cart),'USD'); assert.doesNotThrow(()=>money.assertSingleCurrency(cart));
  cart.vendors[0].packages.push({price:20000});
  assert.throws(()=>money.assertSingleCurrency(cart),/one currency/);
});
