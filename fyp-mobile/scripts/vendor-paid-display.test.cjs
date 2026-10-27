const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('components/vendorordersummary/VendorOrderSummaryIndex.tsx','utf8');
const start=source.indexOf('const total = Number(service?.finalAmount');
const end=source.indexOf('return (',start);
assert.ok(start>=0&&end>start);
const calculate=service=>vm.runInNewContext(`(()=>{${source.slice(start,end)};return {paid,remaining};})()`,{service});
test('unpaid required failed expired and awaiting confirmation never count expected advance as paid',()=>{
 for(const paymentStatus of [undefined,'UNPAID','PAYMENT_REQUIRED','PAYMENT_FAILED','PAYMENT_EXPIRED']){const r=calculate({finalAmount:1000,remainingAmount:500,downPaymentAmount:500,paymentStatus});assert.equal(r.paid,0);assert.equal(r.remaining,1000)}
});
test('confirmed partial payment shows only recorded paid balance',()=>{const r=calculate({finalAmount:1000,remainingAmount:500,paymentStatus:'PARTIALLY_PAID'});assert.equal(r.paid,500);assert.equal(r.remaining,500)});
test('fully paid booking shows full paid total and zero outstanding',()=>{const r=calculate({finalAmount:1000,remainingAmount:500,paymentStatus:'PAID'});assert.equal(r.paid,1000);assert.equal(r.remaining,0)});
test('zero down payment does not invent a payment',()=>{const r=calculate({finalAmount:1000,remainingAmount:1000,downPaymentAmount:0,paymentStatus:'PARTIALLY_PAID'});assert.equal(r.paid,0);assert.equal(r.remaining,1000)});
test('cancelled paid bookings preserve their payment record and invalid balances stay bounded',()=>{const r=calculate({status:'cancelled',price:1000,remainingAmount:500,paymentStatus:'PARTIALLY_PAID'});assert.equal(r.paid,500);for(const remainingAmount of [undefined,'bad',2000]){const r=calculate({price:1000,remainingAmount,paymentStatus:'PARTIALLY_PAID'});assert.equal(r.paid,0);assert.equal(r.remaining,1000)}});
