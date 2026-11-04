const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function compile(path){const r=ts.transpileModule(fs.readFileSync(path,'utf8'),{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});assert.equal(r.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,path);return r.outputText;}
function load(path,imports={}){const m={exports:{}};vm.runInNewContext(compile(path),{module:m,exports:m.exports,require:n=>imports[n]||(n === './InfoHelp' ? load('components/booking/InfoHelp.tsx',imports) : require(n)),Date,Intl,Number});return m.exports;}
const utils=load('utils/deliveryBooking.ts');
const paid={deliveryFeeType:'PAID',deliveryFee:300,deliveryExtraWeightEnabled:true,deliveryIncludedWeightKg:1,deliveryExtraFeePerKg:100,deliveryWeightKg:1.5,deliveryReserveMinutes:30,deliveryWeightBasis:'PACKAGE'};
const native={View:({children})=>React.createElement('div',null,children),Text:({children})=>React.createElement('span',null,children),TextInput:({value,onChangeText,...p})=>React.createElement('input',{value,readOnly:true,'aria-label':p.accessibilityLabel}),TouchableOpacity:({children})=>React.createElement('button',null,children),Switch:()=>React.createElement('input',{type:'checkbox'}),StyleSheet:{create:s=>s}};
test('delivery fee stays flat across quantities, guests and legacy weight settings', () => {
  for (const [quantity, guests, catering] of [[1, 50, false], [10, 50, true]]) {
    const fee = utils.deliveryFee(paid, quantity, guests, catering);
    assert.equal(fee.totalFee, 300);
    assert.equal(fee.extraFee, 0);
    assert.equal(utils.deliveryFee({...paid, deliveryFeeType:'FREE'}, quantity, guests, catering).totalFee, 0);
  }
});
test('free delivery hides the fee field and paid delivery shows only the flat fee', () => {
  const Fields = load('components/booking/DeliveryPackageFields.tsx', {'react-native':native, '@/utils/deliveryBooking':utils}).default;
  const render = value => renderToStaticMarkup(React.createElement(Fields, {value, onChange(){}}));
  assert.match(render({...paid, deliveryFeeType:'FREE'}), /Free Delivery/);
  assert.doesNotMatch(render({...paid, deliveryFeeType:'FREE'}), /Base delivery fee/);
  assert.match(render(paid), /Base delivery fee/);
  assert.doesNotMatch(render(paid), /Weight covered|Extra fee per additional/);
});
test('saved delivery details show the package amount, fee and local time', () => {
  const Details = load('components/booking/DeliveryDetails.tsx', {'react-native':native, '@/utils/deliveryBooking':utils}).default;
  const render = deliveryFeeType => renderToStaticMarkup(React.createElement(Details, {
    pkg:{delivery:{...paid, deliveryFeeType, baseFee:300, extraFee:100, packageAmount:8000, timeZone:'Asia/Karachi'}, eventStartDateTime:'2026-11-09T08:30:00Z'}
  }));
  assert.match(render('PAID'), /8,000/);
  assert.match(render('PAID'), /1:30 pm/i);
  assert.match(render('PAID'), /Delivery: Rs\. 300/);
  assert.match(render('FREE'), /Free Delivery/);
  assert.doesNotMatch(render('FREE'), /Delivery: Rs/);
});
test('delivery example explains before/after dates with twelve-hour times',()=>{assert.match(utils.deliveryWindowExample(-60,0),/4:00 pm.*5:00 pm/i);assert.match(utils.deliveryWindowExample(-1440,0),/1 day before the event/);assert.doesNotMatch(utils.deliveryWindowExample(-10,0),/Nov|2026/);assert.equal(utils.deliveryWindowExample(60,0),'')});
test('all affected delivery screens compile',()=>{for(const path of ['components/booking/DeliveryTimePicker.tsx','components/rescheduling/ClientRescheduleScreen.tsx','components/paymentconfirmation/PaymentConfirmationIndex.tsx','components/cartmanagement/CartManagementIndex.tsx','components/OrderReview/OrderReviewIndex.tsx','components/VPD/VPDIndex.tsx','components/vendorpackages/VendorPackagesIndex.tsx'])compile(path)});

test('delivery time picker waits for availability, disables unavailable choices and clears stale selections',async()=>{
 let hook=0;const state=[],effects=[],pending=[],buttons=[],changes=[],slots=[];
 const hooks={...React,useState:init=>{const i=hook++;if(!(i in state))state[i]=typeof init==='function'?init():init;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v}];},useEffect:(fn,deps)=>{const i=hook++;const previous=slots[i];if(!previous||deps.some((v,j)=>!Object.is(v,previous.deps[j]))){effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}};
 const mockNative={...native,ActivityIndicator:()=>React.createElement('span',null,'Checking delivery'),Platform:{OS:'android'},TouchableOpacity:props=>{buttons.push(props);return React.createElement('button',null,props.children)}};
 const Picker=load('components/booking/DeliveryTimePicker.tsx',{'react':hooks,'react-native':mockNative,'@react-native-community/datetimepicker':()=>null,'./PickerSheet':()=>null,'@/utils/deliveryBooking':utils,'@/services/growthApiClient':{growthApi:{post:(url,body)=>new Promise((resolve,reject)=>pending.push({url,body,resolve,reject}))}}}).default;
 const props={vendorId:'vendor',packageId:'package',eventCityId:'city',eventDate:'2026-11-09',eventStartTime:'14:00',eventDurationMinutes:120,onChange:slot=>changes.push(slot)};
 const render=()=>{hook=0;buttons.length=0;const html=renderToStaticMarkup(Picker(props));while(effects.length)effects.shift()();return html;};
 assert.match(render(),/Checking delivery/);render();assert.equal(pending.length,1);assert.equal(changes.at(-1),null);
 const response={timeZone:'Asia/Karachi',date:'2026-11-09',earliest:'2026-11-09T08:00:00Z',latest:'2026-11-09T09:00:00Z',eventStartDateTime:'2026-11-09T09:00:00Z',slots:[{startDateTime:'2026-11-09T08:00:00Z',endDateTime:'2026-11-09T08:30:00Z',available:false,reason:'Already booked'},{startDateTime:'2026-11-09T08:30:00Z',endDateTime:'2026-11-09T09:00:00Z',available:true}]};
 pending[0].resolve(response);await new Promise(setImmediate);const html=render();assert.match(html,/Delivery date · 9 Nov 2026/);assert.doesNotMatch(html,/Choose delivery date ·/);assert.match(html,/30 minutes before event/);assert.match(html,/Already booked/);const disabled=buttons.find(b=>b.accessibilityState?.disabled);assert.ok(disabled);disabled.onPress();assert.equal(changes.at(-1),null);buttons.find(b=>b.accessibilityState?.disabled===false).onPress();assert.equal(changes.at(-1).startDateTime,response.slots[1].startDateTime);
 props.eventStartTime='15:00';render();render();assert.equal(changes.at(-1),null);assert.equal(pending.length,2);assert.match(render(),/Checking delivery/);
 pending[1].reject(new Error('Unavailable'));await new Promise(setImmediate);assert.match(render(),/Try again/);assert.equal(changes.at(-1),null);
 buttons[0].onPress();render();
 pending[2].resolve({...response, earliest:'2026-11-08T08:00:00Z', slots:response.slots.map(slot=>({...slot,available:false,reason:'Booking must be made at least 1 day(s) before the service starts'}))});
 await new Promise(setImmediate);
 const multiDay = render();
 assert.match(multiDay,/Choose delivery date · 9 Nov 2026/);
 assert.match(multiDay,/Try another delivery date or choose a later event date or time/);
 assert.match(multiDay,/at least 1 day before the service starts/);

});

test('add and edit preview show the flat delivery fee and reserved time', () => {
 const Details = load('components/booking/DeliveryDetails.tsx', {'react-native':native, '@/utils/deliveryBooking':utils}).default;
 const preview = pkg => renderToStaticMarkup(React.createElement(Details, {pkg, showConfiguration:true}));
 const html = preview({...paid, deliveryReserveMinutes:60});
 assert.match(html, /Base delivery fee/);
 assert.match(html, /Rs\. 300/);
 assert.match(html, /1 hour per delivery/);
 assert.doesNotMatch(html, /Weight covered|Extra weight charges/);
 const free = preview({...paid, deliveryFeeType:'FREE'});
 assert.match(free, /Free Delivery/);
 assert.doesNotMatch(free, /Base delivery fee/);
 assert.match(free, /30 minutes per delivery/);
 for (const path of ['components/VPDAddNewPackages/VPDAddNewPackages.tsx','components/editpackage/EditPackageIndex.tsx']) {
   assert.match(fs.readFileSync(path,'utf8'), /<DeliveryDetails pkg=\{delivery\} showConfiguration \/>/);
   compile(path);
 }
});

test('delivery explanations open only when the accessible info button is tapped',()=>{
 const buttons=[],alerts=[];
 const n={...native,Alert:{alert:(...args)=>alerts.push(args)},TouchableOpacity:props=>{buttons.push(props);return React.createElement('button',null,props.children);}};
 const Fields=load('components/booking/DeliveryPackageFields.tsx',{'react-native':n,'@/utils/deliveryBooking':utils}).default;
 const html=renderToStaticMarkup(React.createElement(Fields,{value:paid,onChange(){}}));
 assert.doesNotMatch(html,/Changing units converts|Charged once for this booking|Each started additional|Choose how long/);
 assert.equal(alerts.length,0);
 buttons.find(b=>b.accessibilityLabel==='About Base delivery fee (Rs.)').onPress();assert.match(alerts[0][1],/Charged once for this booking/);
 buttons.find(b=>b.accessibilityLabel==='About Time reserved for each delivery').onPress();assert.match(alerts[1][1],/Minutes or Hours/);
 const Info=load('components/booking/InfoHelp.tsx',{'react-native':n}).default;
 renderToStaticMarkup(React.createElement(Info,{title:'Delivery Window',message:utils.deliveryWindowHelp(-10,0)}));
 buttons.find(b=>b.accessibilityLabel==='About Delivery Window').onPress();
 assert.match(alerts[2][1],/Example: If an event starts at 5:00 PM.*4:50 PM.*5:00 PM/);
 assert.match(alerts[2][1],/actual delivery date and time depend on the customer's event and your availability/);
 assert.doesNotMatch(alerts[2][1],/9 Nov|2026/);
});

test('delivery reserve switches minutes and hours without changing the saved duration',()=>{
 let hook=0;const state=[],inputs=[],buttons=[];let value={...paid,deliveryReserveMinutes:60};
 const hooks={...React,useState:init=>{const i=hook++;if(!(i in state))state[i]=init;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v}];}};
 const n={...native,TextInput:props=>{inputs.push(props);return React.createElement('input',{value:props.value,readOnly:true});},TouchableOpacity:props=>{buttons.push(props);return React.createElement('button',null,props.children);}};
 const Fields=load('components/booking/DeliveryPackageFields.tsx',{'react':hooks,'react-native':n,'@/utils/deliveryBooking':utils}).default;
 const render=()=>{hook=0;inputs.length=0;buttons.length=0;return renderToStaticMarkup(Fields({value,onChange:v=>{value=v;}}));};
 const reserve=()=>inputs.find(i=>i.accessibilityLabel==='Time reserved for each delivery');
 const choose=text=>buttons.find(b=>renderToStaticMarkup(React.createElement(React.Fragment,null,b.children))===`<span>${text}</span>`).onPress();
 render();assert.equal(reserve().value,'60');choose('Hours');render();assert.equal(reserve().value,'1');assert.equal(value.deliveryReserveMinutes,60);
 reserve().onChangeText('1.5');render();assert.equal(value.deliveryReserveMinutes,90);assert.equal(utils.deliverySettingsError(value),'');assert.equal(utils.formatDeliveryReserve(90),'1.5 hours');
 choose('Minutes');render();assert.equal(reserve().value,'90');choose('Hours');render();reserve().onChangeText('1.15');render();assert.equal(value.deliveryReserveMinutes,69);
 reserve().onChangeText('25');render();assert.match(utils.deliverySettingsError(value),/24 hours/);
 reserve().onChangeText('0');render();assert.ok(utils.deliverySettingsError(value));
 reserve().onChangeText('0.5');render();assert.equal(value.deliveryReserveMinutes,30);assert.equal(utils.deliverySettings(value).deliveryReserveMinutes,30);
});
