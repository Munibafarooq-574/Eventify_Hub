const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/bookingNoticeSelection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports});const toggle=(a,b)=>Array.from(m.exports.toggleBookingNotice(a,b));
test('two hours removes the default unrestricted notice',()=>assert.deepEqual(toggle([0],120),[120]));
test('positive choices repair mixed legacy options and preserve positive options',()=>{assert.deepEqual(toggle([0,60],120),[60,120]);assert.deepEqual(toggle([120],240),[120,240])});
test('unrestricted notice replaces positive choices and can be deselected',()=>{assert.deepEqual(toggle([120,240],0),[0]);assert.deepEqual(toggle([0],0),[])});
test('selection toggles without duplicates or mutation',()=>{const a=[120,240];assert.deepEqual(toggle(a,120),[240]);assert.deepEqual(a,[120,240])});
test('global and day controls share selection logic and calendar excludes zero on add',()=>{const s=fs.readFileSync('components/VendorAvailabilitySettings/VendorAvailabilitySettings.tsx','utf8');assert.match(s,/toggleBookingNotice\(current, value\)/);assert.match(s,/toggleBookingNotice\(base, opt.value\)/);assert.match(fs.readFileSync('components/vendormyevents/VendorAvailabilityEditor.tsx','utf8'),/filter\(\(value\) => value > 0\)/)});

const read = (path) => fs.readFileSync(path, 'utf8');
test('vendor-wide booking notice choices are whole days only', () => {
  const source = read('components/VendorAvailabilitySettings/VendorAvailabilitySettings.tsx');
  assert.match(source, /const ADVANCE_OPTIONS = \[1, 2, 3, 5, 7, 14, 30\]\.map\(\(days\) => \(\{/);
  assert.match(source, /value: days \* 1440/);
  assert.match(source, /minimumAdvanceMinutes: 1440/);
  assert.match(source, /value >= 1440 && value % 1440 === 0/);
});
test('backend validates minimum and day multiples for global and per-day notices', () => {
  const dto = read('../fyp-backend/src/vendor-availability/dto/set-availability.dto.ts');
  const service = read('../fyp-backend/src/vendor-availability/vendor-availability.service.ts');
  assert.match(dto, /@Min\(1440\)/);
  assert.match(dto, /@IsDivisibleBy\(1440\)/);
  assert.equal((dto.match(/@Min\(1440, \{ each: true \}\)/g) || []).length, 2);
  assert.equal((dto.match(/@IsDivisibleBy\(1440, \{ each: true \}\)/g) || []).length, 2);
  assert.match(service, /minutes < 1440 \|\| minutes % 1440 !== 0/);
  assert.match(service, /dto\.minimumAdvanceMinutes < 1440 \|\|\s*dto\.minimumAdvanceMinutes % 1440 !== 0/);
});
test('legacy notices below one day fall back to rolling 24-hour cutoff', () => {
  const service = read('../fyp-backend/src/vendor-availability/vendor-availability.service.ts');
  assert.match(service, /advanceNoticeOptionsMinutes\.filter\([\s\S]*?minutes >= 1440/);
  assert.match(service, /validNoticeOptions\.length > 0\s*\? Math\.min\(\.\.\.validNoticeOptions\)\s*: 1440/);
  assert.match(service, /\(startDateTime\.getTime\(\) - Date\.now\(\)\) \/ 60000/);
  assert.match(service, /minutesUntilService < minimumNotice/);
});
test('per-day editor accepts days and saves notices in whole-day minutes', () => {
  const editor = read('components/vendormyevents/VendorAvailabilityEditor.tsx');
  const prompt = read('components/vendormyevents/HourPromptModal.tsx');
  assert.match(editor, /const minutes = days \* 1440/);
  assert.match(editor, /minutes >= 1440 && minutes % 1440 === 0/);
  assert.match(prompt, /Number\.isInteger\(days\) \|\| days < 1/);
  assert.match(prompt, /onSubmit\(days\)/);
});
