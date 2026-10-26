const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/bookingActivity.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports});const {bookingActivity:rows,formatBookingActivityTime:format}=m.exports;
const t='2026-10-26T15:18:00.000Z';
test('each action uses its own timestamp; updatedAt never substitutes for missing history',()=>{
 const b={status:'completed',paymentStatus:'PARTIALLY_PAID',createdAt:t,acceptedAt:t,confirmationTime:t,completedAt:t,updatedAt:'2099-01-01'};
 assert.equal(rows(b).map(r=>r.label).join(','),'Requested,Accepted / Processing,Confirmed,Completed');
 assert.ok(rows(b).every(r=>r.at===t));assert.equal(rows({status:'completed',updatedAt:t})[0].at,null);
});
test('pending rejected expired and no longer assigned have distinct dates',()=>{
 for(const [b,label] of [[{status:'pending',createdAt:t},'Requested'],[{status:'rejected',rejectedAt:t},'Rejected'],[{status:'expired',paymentStatus:'PAYMENT_EXPIRED',expiredAt:t},'Payment expired'],[{status:'expired',expiredAt:t},'Expired'],[{status:'rejected',replacementOutcome:'NO_LONGER_ASSIGNED',replacementFinalizedAt:t},'No longer assigned']]){assert.equal(rows(b).length,1);assert.equal(rows(b)[0].label,label);assert.equal(rows(b)[0].at,t)}
});
test('cancellation timestamp is shown once when existing details own it',()=>{const b={status:'cancelled_by_vendor',cancelledAt:t};assert.equal(rows(b)[0].at,t);assert.equal(rows(b,true).length,0)});
test('timezone and twelve hour format preserve exact instant, invalid dates are safe',()=>{
 assert.match(format(t,'Asia/Karachi'),/8:18 pm/i);assert.match(format(t,'America/New_York'),/11:18 am/i);assert.match(format(t,'Asia/Karachi'),/26 Oct 2026/);assert.equal(format('bad'),'Time not recorded');assert.doesNotThrow(()=>format(t,'bad-zone'));
});
test('all three screens reuse shared component and compile',()=>{for(const p of ['components/myevents/MyEventsIndex.tsx','components/vendorordersummary/VendorOrderSummaryIndex.tsx','components/vendormyevents/VendorMyEventsIndex.tsx','components/booking/BookingActivity.tsx']){const s=fs.readFileSync(p,'utf8');assert.equal(ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true}).diagnostics.length,0);assert.match(s,/BookingActivity/);}});
