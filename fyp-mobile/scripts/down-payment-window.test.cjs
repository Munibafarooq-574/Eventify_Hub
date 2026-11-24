const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('client blocks advance pay/retry when canonical deadline passes without touching remaining payment',()=>{const s=fs.readFileSync('components/myevents/MyEventsIndex.tsx','utf8');assert.match(s,/paymentStatus === 'PAYMENT_REQUIRED' && !paymentOverdue && !hasPendingPayment/);assert.match(s,/paymentStatus === 'PAYMENT_FAILED' && !paymentOverdue && !hasPendingPayment/);assert.match(s,/isRemainingDue \? vendor\?\.remainingPaymentDeadline/);assert.match(s,/paymentBreakdown\?\.paymentDeadline \?\? vendor\?\.paymentDeadline/);assert.match(s,/Payment verification overdue/);assert.match(s,/setInterval\(\(\) => setPaymentNow\(Date.now\(\)\), 30000\)/)});
test('deadline presentation treats exact deadline as overdue',()=>{const s=fs.readFileSync('components/myevents/MyEventsIndex.tsx','utf8');const expr=s.match(/const paymentOverdue = (.+);/)[1];assert.equal(vm.runInNewContext(expr,{paymentDeadline:new Date(100),paymentNow:100}),true);assert.equal(vm.runInNewContext(expr,{paymentDeadline:new Date(101),paymentNow:100}),false)});
test('vendor sees verification overdue without falsely confirming service',()=>{const s=fs.readFileSync('components/vendorordersummary/VendorOrderSummaryIndex.tsx','utf8');assert.match(s,/paymentVerificationOverdue/);assert.match(s,/Payment verification overdue — service not secured/)});

test('payment and acceptance conflicts retain readable business messages without transport details',()=>{const ts=require('typescript');const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('services/bookingActionError.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{module,exports:module.exports});const helper=module.exports.bookingActionError;const message='Not enough time remains for payment and service preparation.';assert.equal(helper({response:{status:409,data:{message}}},'fallback').message,message);assert.equal(helper({response:{status:520,data:{message:'<html>proxy</html>'}}},'Please try again').message,'Please try again');assert.match(helper({response:{status:401}},'fallback').message,/sign in again/)});

test('summary groups only eligible advance payments and respects booking holds', () => {
  const ts = require('typescript');
  const source = fs.readFileSync('components/myevents/MyEventsIndex.tsx', 'utf8');
  const start = source.indexOf('  const paymentActions =');
  const end = source.indexOf('  const eventRows =', start);
  const context = {
    rescheduleRequests: [], paymentNow: 100, currencyOf: booking => booking.currency ?? 'USD',
    paymentBreakdowns: { a: {}, b: {}, pending: { pendingPayment: {} }, paid: { latestSuccessfulPayment: {} } },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(source.slice(start, end)) + '\nthis.actions = paymentActions;', context);
  const booking = (id, fields = {}) => ({
    _id: id, status: 'accepted', paymentStatus: 'PAYMENT_REQUIRED',
    paymentDeadline: new Date(200), downPaymentAmount: 22.5, ...fields,
  });
  const groups = new Map([['vendor', [
    booking('a'), booking('b', { paymentStatus: 'PAYMENT_FAILED', downPaymentAmount: 42, paymentDeadline: new Date(150) }),
    booking('late', { paymentDeadline: new Date(100) }), booking('pending'), booking('paid'),
    booking('unavailable'), booking('waiting', { status: 'pending' }),
  ]]]);
  const [action] = context.actions({ _id: 'event' }, groups);
  assert.equal(action.amount, 64.5);
  assert.equal(action.deadline, 150);
  assert.equal(action.eligible.length, 2);
  assert.equal(action.combined, true);
  const [single] = context.actions({ _id: 'event' }, new Map([['single', [booking('single')]]]));
  assert.equal(single.amount, 22.5);
  assert.equal(single.combined, false);
  context.rescheduleRequests.push({ orderId: 'event', resolutionStatus: 'PENDING' });
  assert.equal(context.actions({ _id: 'event' }, groups).length, 0);
});

test('reschedule action requires a future original event and preserves existing restrictions',()=>{const s=fs.readFileSync('components/myevents/MyEventsIndex.tsx','utf8');assert.match(s,/new Date\(event.eventStartDateTime \|\| event.eventDate\).getTime\(\) > paymentNow/);assert.match(s,/!\['completed', 'cancelled'\].includes\(String\(event.status/);assert.match(s,/!hasSuccessfulVendorPayment/)});
