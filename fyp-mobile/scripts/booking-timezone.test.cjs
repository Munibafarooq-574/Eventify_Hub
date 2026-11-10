const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const compiled = ts.transpileModule(fs.readFileSync('utils/bookingTimezone.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api });

test('San Francisco keeps the selected date and 3–5 PM on phones in either country', () => {
  const script = `const exports = {}; ${compiled}; console.log(JSON.stringify([
    exports.formatBookingDate('2026-11-12T23:00:00Z','America/Los_Angeles'),
    exports.formatBookingTime('2026-11-12T23:00:00Z','America/Los_Angeles'),
    exports.formatBookingTime('2026-11-13T01:00:00Z','America/Los_Angeles'),
    exports.formatCalendarDate('2026-11-12T00:00:00Z'),
    exports.eventLocalDateTime('2026-11-12','15:00','America/Los_Angeles').toISOString()
  ]));`;
  for (const TZ of ['Asia/Karachi','America/Los_Angeles','Pacific/Honolulu','Asia/Kathmandu']) {
    const values = JSON.parse(execFileSync(process.execPath, ['-e', script], {env:{...process.env,TZ},encoding:'utf8'}));
    assert.deepEqual(values, ['12 Nov 2026','3:00 PM','5:00 PM','12 Nov 2026','2026-11-12T23:00:00.000Z']);
  }
});
test('overnight service dates follow the event timezone independently of the event calendar date', () => {
  assert.equal(api.bookingDateKey('2026-11-13T07:30:00Z','America/Los_Angeles'), '2026-11-12');
  assert.equal(api.bookingDateKey('2026-11-13T08:30:00Z','America/Los_Angeles'), '2026-11-13');
  assert.equal(api.formatCalendarDate('2026-11-12T00:00:00Z'), '12 Nov 2026');
});
test('Pakistan, New York summer/winter and fractional Nepal offsets resolve from event wall time', () => {
  for (const [date,time,zone,expected] of [
    ['2026-11-12','15:00','Asia/Karachi','2026-11-12T10:00:00.000Z'],
    ['2026-07-12','15:00','America/New_York','2026-07-12T19:00:00.000Z'],
    ['2026-11-12','15:00','America/New_York','2026-11-12T20:00:00.000Z'],
    ['2026-11-12','15:00','Asia/Kathmandu','2026-11-12T09:15:00.000Z'],
  ]) assert.equal(api.eventLocalDateTime(date,time,zone).toISOString(),expected);
});
test('DST gaps and repeated wall times are never silently shifted', () => {
  assert.ok(Number.isNaN(api.eventLocalDateTime('2026-03-08','02:30','America/Los_Angeles').getTime()));
  assert.ok(Number.isNaN(api.eventLocalDateTime('2026-11-01','01:30','America/Los_Angeles').getTime()));
});
test('wall strings remain event-city values and legacy timestamps use an explicit fallback', () => {
  assert.equal(api.formatBookingTime('15:00','America/Los_Angeles'),'3:00 PM');
  assert.equal(api.bookingTimeZone({eventCityId:{timeZone:'America/Los_Angeles'}}),'America/Los_Angeles');
  assert.equal(api.bookingTimeZone({vendorOrders:[{bookingChatTimeZone:'Asia/Karachi'}]}),'Asia/Karachi');
  assert.equal(api.bookingTimeZone({}),'UTC');
  assert.equal(api.formatBookingTime('bad','not/a/zone'),'N/A');
});

test('actual cart and review resolvers use the current event-city schedule after editing a draft', () => {
  for (const [file, name] of [
    ['components/cartmanagement/CartManagementIndex.tsx','getResolvedServiceTiming'],
    ['components/OrderReview/OrderReviewIndex.tsx','getResolvedServiceWindow'],
  ]) {
    const source = ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let initializer;
    const visit = node => {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer=node.initializer.getText(source);
      ts.forEachChild(node,visit);
    };
    visit(source);
    assert.ok(initializer, `${name} must exist`);
    const exports = {};
    vm.runInNewContext(ts.transpileModule(`exports.resolve = ${initializer}`,{}).outputText, {
      exports, ...api, eventTimeZone:'America/Los_Angeles',
      eventDetails:{eventDate:'2026-11-12',startTime:'15:00',endTime:'17:00',durationMinutes:120},
    });
    const pkg = {bookingType:'DURATION_BASED',durationMinutes:180,requiredServiceWindow:{startDateTime:'2026-11-11T23:00:00Z',endDateTime:'2026-11-12T01:00:00Z'}};
    const resolved=exports.resolve(pkg);
    assert.equal(resolved.start?.toISOString() || resolved.startDateTime,'2026-11-12T23:00:00.000Z');
    assert.equal(resolved.end?.toISOString() || resolved.endDateTime,'2026-11-13T02:00:00.000Z');
    const appointment=exports.resolve({...pkg,bookingType:'TIME_SLOT_BASED'});
    assert.equal(new Date(appointment.start || appointment.startDateTime).getTime(), Date.parse(pkg.requiredServiceWindow.startDateTime));
  }
});

test('requested, payment, cancellation and refund timestamps use the event-city date and 12-hour time', () => {
  assert.equal(api.formatBookingDateTime('2026-11-10T09:57:00Z','America/Los_Angeles'), '10 Nov 2026 · 1:57 AM');
  assert.equal(api.formatBookingDateTime('2026-11-10T03:30:00Z','America/Los_Angeles'), '9 Nov 2026 · 7:30 PM');
  assert.equal(api.formatBookingDateTime('2026-11-10T09:57:00Z','Asia/Karachi'), '10 Nov 2026 · 2:57 PM');
  const cancellation = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/bookingCancellation.ts','utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
  }).outputText, {exports:cancellation,require:()=>api});
  assert.equal(cancellation.bookingCancellation({status:'cancelled',cancelledAt:'2026-11-10T03:30:00Z'},'America/Los_Angeles').cancelledAt,'9 Nov 2026 · 7:30 PM');
  assert.equal(cancellation.bookingCancellation({status:'cancelled'},'America/Los_Angeles').cancelledAt,'Not recorded');
});

test('chat separators and message times follow the opened booking and each automatic notice timezone', () => {
  const file='components/message/MessageIndex.tsx';
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=new Set(['formatTime','messageZone','dateLabel','buildDisplayData']);
  const declarations=[];
  const visit=node=>{
    if(ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) declarations.push(`const ${node.name.getText(source)} = ${node.initializer.getText(source)};`);
    ts.forEachChild(node,visit);
  };
  visit(source);
  const exports={};
  vm.runInNewContext(ts.transpileModule(declarations.join('\n')+'\nexports.build=buildDisplayData; exports.time=formatTime; exports.zone=messageZone;',{}).outputText,{
    exports,...api,getMsgTime:m=>m.timestamp,getMsgText:m=>m.message,
  });
  const ordinary={_id:'ordinary',timestamp:'2026-11-10T03:30:00Z',message:'Hello'};
  const notice={_id:'notice',timestamp:'2026-11-10T03:30:00Z',message:'Times shown in Asia/Karachi',bookingNoticeKey:'booking:confirmed'};
  const separators=exports.build([ordinary,notice],'America/Los_Angeles').filter(row=>row.__type==='separator');
  assert.ok(separators.some(row=>row._id==='sep-America/Los_Angeles:2026-11-09'));
  assert.ok(separators.some(row=>row._id==='sep-Asia/Karachi:2026-11-10'));
  assert.equal(exports.time(ordinary.timestamp,exports.zone(ordinary,'America/Los_Angeles')),'7:30 PM');
});
