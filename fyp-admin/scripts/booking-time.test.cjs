// node --test scripts/booking-time.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(relative, imports = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports: mod.exports, module: mod, require: name => imports[name] || require(name) });
  return mod.exports;
}
const helpers = load('lib/booking-time.ts');
const mobile = load('../fyp-mobile/utils/bookingCancellation.ts');
test('mobile and admin notice labels agree across the 24-hour boundary', () => {
  for (const [hours, expected] of [[0,'0 hours'],[1,'1 hour'],[23,'23 hours'],[24,'1 day'],[25,'1 day 1 hour'],[27,'1 day 3 hours'],[163,'6 days 19 hours'],[594,'24 days 18 hours'],[720,'30 days'],[594.9,'24 days 18 hours']]) {
    assert.equal(helpers.formatNoticeHours(hours),expected);
    assert.equal(mobile.formatNoticeHours(hours),expected);
  }
});
test('admin duration uses the parent event minutes rather than the package window', () => {
  assert.equal(helpers.eventDurationLabel({eventDurationMinutes:180,eventStartDateTime:'2026-11-09T08:00:00Z',eventEndDateTime:'2026-11-09T11:00:00Z'}),'3 hours');
  assert.equal(helpers.eventDurationLabel({eventDurationMinutes:'90'}),'1 hour 30 minutes');
  assert.equal(helpers.eventDurationLabel({eventStartDateTime:'2026-11-09T23:00:00Z',eventEndDateTime:'2026-11-10T02:00:00Z'}),'3 hours');
  assert.equal(helpers.eventDurationLabel({eventStartDateTime:'bad',eventEndDateTime:'bad'}),'N/A');
  assert.equal(helpers.eventDurationLabel({eventDurationMinutes:0}),'N/A');
  assert.equal(helpers.eventDurationLabel({eventDuration:'2 hours'}),'2 hours');
});
test('saved policy ranges and settings render days with remaining hours', () => {
  const Component=load('components/BookingPolicySnapshot.tsx',{'@/lib/booking-time':helpers}).default;
  const tiers=[{minHoursBeforeEvent:0,percentage:0},{minHoursBeforeEvent:27,percentage:50},{minHoursBeforeEvent:163,percentage:75},{minHoursBeforeEvent:720,percentage:100}];
  const settings={clientRefunds:{refundable:tiers,partiallyRefundable:tiers,nonRefundable:tiers},vendorCausedClientRefunds:tiers,vendorPenalties:tiers,paymentHoldHours:24,postServiceIssueWindowHours:73};
  const html=renderToStaticMarkup(React.createElement(Component,{snapshot:{schemaVersion:1,policyConfigId:'test',policyRevision:2,capturedAt:'2026-10-17T08:00:00Z',selectedPolicy:'REFUNDABLE',settings}}));
  assert.match(html,/1 day 3 hours/);assert.match(html,/6 days 19 hours/);assert.match(html,/30 days/);assert.match(html,/3 days 1 hour/);
  assert.doesNotMatch(html,/163 hours|720 hours|73 hours/);
  assert.equal(settings.clientRefunds.refundable[1].minHoursBeforeEvent,27);
});

test('policy editor edits days/hours but emits exact backend hours', () => {
  const source=fs.readFileSync(path.join(__dirname,'../components/CancellationPolicyForm.tsx'),'utf8');
  const ast=ts.createSourceFile('form.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const input=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='HoursInput');
  const mod={exports:{}};
  const code=ts.transpileModule('export '+input.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports:mod.exports,module:mod,require,useRef:()=>({current:null}),useEffect:()=>{},formatNoticeHours:helpers.formatNoticeHours});
  let changed;
  const element=mod.exports.HoursInput({label:'Notice',value:27,onChange:value=>changed=value});
  const fields=element.props.children[0].props.children.map(label=>label.props.children[1]);
  assert.equal(fields[0].props.value,1);assert.equal(fields[1].props.value,3);
  fields[0].props.onChange({target:{value:'2'}});assert.equal(changed,51);
  fields[1].props.onChange({target:{value:'4'}});assert.equal(changed,28);
});
