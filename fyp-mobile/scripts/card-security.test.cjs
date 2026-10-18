const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const ts=require('typescript');
function load(file,imports={},globals={}){const m={exports:{}};const result=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true},reportDiagnostics:true});assert.equal(result.diagnostics.length,0);vm.runInNewContext(result.outputText,{module:m,exports:m.exports,require:name=>{if(name in imports)return imports[name];throw Error(name)},...globals});return m.exports;}
const validation=load('utils/cardPaymentValidation.ts');
const now=new Date('2026-10-17T12:00:00Z');
const valid={name:'Muniba Farooq',number:'4242424242424242',expiry:'10/26',cvv:'123'};
test('expiry accepts this month and rejects invalid month, past date and malformed input',()=>{
 for(const value of ['10/26','11/26','01/27'])assert.equal(validation.isExpiryValid(value,now),true,value);
 for(const value of ['09/26','12/25','00/27','13/27','1/27','11/2027','11/2x',''])assert.equal(validation.isExpiryValid(value,now),false,value);
 assert.equal(validation.isExpiryValid('12/26',new Date('2027-01-01T00:00:00Z')),false);
});
test('card numbers require a checksum and this simulator accepts only published test presets',()=>{
 assert.equal(validation.isCardNumberValid('4242 4242 4242 4242'),true);
 for(const value of ['4242424242424241','0000000000000000','1111111111111111','4242','4242abc424242424242'])assert.equal(validation.isCardNumberValid(value),false);
 assert.equal(validation.validateCardForm({...valid,number:'4000056655665556'},now).valid,false); // valid checksum, outside this simulator's presets
});
test('CVV accepts exactly three digits or four for Amex, with no pretend issuer validation',()=>{
 assert.equal(validation.validateCardForm(valid,now).valid,true);
 for(const cvv of ['12','1234','12a',' 123'])assert.equal(validation.validateCardForm({...valid,cvv},now).valid,false);
 assert.equal(validation.validateCardForm({...valid,number:'378282246310005',cvv:'1234'},now).valid,true);
 assert.equal(validation.validateCardForm({...valid,number:'378282246310005',cvv:'123'},now).valid,false);
 assert.equal(validation.formatCardNumber('378282246310005'),'3782 822463 10005');
});
test('payable amount comes from backend status and blocks pending, paid and invalid amounts',()=>{
 assert.equal(validation.cardPaymentAmount({paymentStatus:'PAYMENT_REQUIRED',downPaymentAmount:1500},'DOWN_PAYMENT'),1500);
 assert.equal(validation.cardPaymentAmount({paymentStatus:'PARTIALLY_PAID',outstandingAmount:2500},'REMAINING'),2500);
 for(const data of [{paymentStatus:'PAID',downPaymentAmount:1500},{paymentStatus:'PAYMENT_REQUIRED',downPaymentAmount:0},{paymentStatus:'PAYMENT_REQUIRED',downPaymentAmount:NaN},{paymentStatus:'PAYMENT_REQUIRED',downPaymentAmount:1500,pendingPayment:{}}])assert.throws(()=>validation.cardPaymentAmount(data,'DOWN_PAYMENT'));
 assert.throws(()=>validation.cardPaymentAmount({paymentStatus:'PAYMENT_REQUIRED',outstandingAmount:1500},'REMAINING'));
 assert.throws(()=>validation.cardPaymentAmount({organizerId:'other',paymentStatus:'PAYMENT_REQUIRED',downPaymentAmount:1500},'DOWN_PAYMENT','client')); 
});
function storage(){let user={_id:'a'.repeat(24)},token='session';const values=new Map();let onRead;
 const store={getUserData:async()=>user,getSecureData:async key=>{if(key==='token')return token;const value=values.get(key);if(onRead)onRead();return value||null;},saveSecureData:async(key,value)=>values.set(key,value)};
 const api=load('services/demoSavedCards.ts',{'../store':store,'../utils/cardPaymentValidation':validation});
 return{api,values,user:()=>user,setUser:value=>{user=value},setToken:value=>{token=value},onRead:fn=>{onRead=fn}};
}
test('saved-card storage whitelists synthetic identifiers, never PAN/CVV, and deduplicates',async()=>{
 const s=storage();const owner=await s.api.getCardOwnerId();
 const entry={demoCardId:'visa',name:'Muniba',expiry:'12/99',number:valid.number,cvv:'123',cardNumber:valid.number};
 await s.api.rememberDemoCard(owner,entry);await s.api.rememberDemoCard(owner,{...entry,name:'Updated name'});
 const serialized=[...s.values.values()][0];assert.doesNotMatch(serialized,/4242424242424242|cvv|cardNumber|"number"/i);
 const saved=await s.api.listDemoCards(owner);assert.equal(saved.length,1);assert.equal(saved[0].name,'Updated name');assert.deepEqual(Object.keys(saved[0]).sort(),['demoCardId','expiry','name']);
 await s.api.removeDemoCard(owner,'visa');assert.equal((await s.api.listDemoCards(owner)).length,0);
});
test('one account cannot read or remove another account shortcuts',async()=>{
 const s=storage();const first=await s.api.getCardOwnerId();await s.api.rememberDemoCard(first,{demoCardId:'visa',name:'First user',expiry:'12/99'});
 s.setUser({_id:'b'.repeat(24)});const second=await s.api.getCardOwnerId();assert.equal((await s.api.listDemoCards(second)).length,0);
 await assert.rejects(s.api.listDemoCards(first),/account changed/);await assert.rejects(s.api.removeDemoCard(first,'visa'),/account changed/);
 s.setUser({_id:first});assert.equal((await s.api.listDemoCards(first))[0].name,'First user');
});
test('corrupt storage is safe and account changes during read cannot disclose an old shortcut',async()=>{
 const s=storage();const owner=await s.api.getCardOwnerId();s.values.set(`eventify-demo-cards-v1-${owner}`,'bad JSON');assert.equal((await s.api.listDemoCards(owner)).length,0);
 await s.api.rememberDemoCard(owner,{demoCardId:'visa',name:'First user',expiry:'12/99'});s.onRead(()=>s.setUser({_id:'b'.repeat(24)}));await assert.rejects(s.api.listDemoCards(owner),/account changed/);
});
test('signed-out users and unsupported synthetic IDs cannot save cards',async()=>{
 const s=storage();const owner=await s.api.getCardOwnerId();await assert.rejects(s.api.rememberDemoCard(owner,{demoCardId:'real-card',name:'User',expiry:'12/99'}));
 s.setToken(null);await assert.rejects(s.api.getCardOwnerId(),/sign in/);assert.equal(s.values.size,0);
});

function checkout({kind='DOWN_PAYMENT',changedAmount=false,pending=false,saveFails=false}={}) {
 const state=[],refs=[],calls=[],alerts=[],remembered=[],events={};let stateIndex=0,refIndex=0,focus,tree,reads=0;
 class Value{interpolate(){return 0;}}
 const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),forwardRef:render=>Object.assign(props=>render(props,null),{}),useState:initial=>{const i=stateIndex++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value}];},useRef:initial=>{const i=refIndex++;if(!refs[i])refs[i]={current:initial};return refs[i]},useEffect(){},useCallback:fn=>fn};
 const native=Object.fromEntries(['View','Text','TextInput','TouchableOpacity','KeyboardAvoidingView','ScrollView','Switch'].map(n=>[n,n]));
 native.StyleSheet={create:s=>s,absoluteFill:{}};native.Alert={alert:(...args)=>alerts.push(args)};native.Platform={OS:'android'};native.Animated={Value,View:'AnimatedView',timing:()=>({start(){}})};native.Easing={cubic:x=>x,out:x=>x,inOut:x=>x};native.useWindowDimensions=()=>({width:390});native.AppState={addEventListener:(name,cb)=>{events[name]=cb;return{remove(){}}}};
 const owner='a'.repeat(24),booking='b'.repeat(24);let saved=[];
 const imported={
 react,'react-native':native,'@expo/vector-icons':{Ionicons:'Icon'},'expo-router':{router:{back(){},replace(){}},useLocalSearchParams:()=>({vendorOrderId:booking,amount:'99999999',paymentType:kind}),useFocusEffect:cb=>{focus=cb}},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:24,bottom:12})},
 '@/utils/cardPaymentValidation':validation,
 '@/services/demoSavedCards':{getCardOwnerId:async()=>owner,assertCardOwner:async id=>assert.equal(id,owner),listDemoCards:async()=>saved,rememberDemoCard:async(id,card)=>{remembered.push({id,card});if(saveFails)throw Error('Cannot save');saved=[card];return saved;},removeDemoCard:async()=>{saved=[];return[]}},
 '@/services/getPaymentStatus':async()=>{reads++;return{organizerId:owner,paymentStatus:kind==='REMAINING'?'PARTIALLY_PAID':'PAYMENT_REQUIRED',downPaymentAmount:changedAmount&&reads>1?2000:1500,outstandingAmount:700,pendingPayment:pending&&reads>1?{}:null}},
 '@/services/createPayment':async(...args)=>{calls.push({type:'down',args});return{paymentId:'pending'}},'@/services/payRemainingAmount':async(...args)=>{calls.push({type:'remaining',args});return{paymentId:'pending'}}};
 const Component=load('components/creditcard/CreditCardIndex.tsx',imported).default;
 function render(){stateIndex=0;refIndex=0;tree=Component();return tree;}
 function nodes(){const all=[];function visit(n){if(!n||typeof n!=='object')return;all.push(n);for(const child of n.props?.children?.flat(Infinity)||[])visit(child);}visit(tree);return all;}
 const field=label=>nodes().find(n=>n.props?.label===label);
 const pay=()=>nodes().find(n=>n.type==='TouchableOpacity'&&n.props.children.flat(Infinity).some(c=>c?.type==='Text'&&c.props.children.includes('Submit test payment')));
 async function start(){render();focus();await new Promise(resolve=>setImmediate(resolve));render();}
 function fill(){for(const [label,value]of [['Cardholder Name','Muniba'],['Test Card Number','4242424242424242'],['Expiry','12/99'],['CVV','123']]){field(label).props.onChangeText(value);render();}}
 return{start,render,field,fill,pay,calls,alerts,remembered,nodes,events,async settle(){await new Promise(resolve=>setImmediate(resolve));render();}};
}
test('checkout uses backend amount, blocks double taps and sends no card fields to payment APIs',async()=>{
 const c=checkout();await c.start();c.fill();c.nodes().find(n=>n.type==='Switch').props.onValueChange(true);c.render();
 assert.equal(c.pay().props.disabled,false);const pay=c.pay().props.onPress;await Promise.all([pay(),pay()]);c.render();
 assert.equal(c.calls.length,1);assert.deepEqual(c.calls[0].args,['b'.repeat(24),'card',true]);
 assert.deepEqual(Object.keys(c.remembered[0].card).sort(),['demoCardId','expiry','name']);
 assert.equal(c.field('CVV').props.value,'');assert.match(c.alerts[0][1],/No real card has been charged/);
 // On a later checkout, a shortcut fills only the synthetic details, never CVV.
 await c.start();
 const saved=c.nodes().find(n=>n.type==='TouchableOpacity'&&n.props.accessibilityRole==='button'&&n.props.children.flat(Infinity).some(child=>child?.props?.children?.includes('Visa')));
 await saved.props.onPress();c.render();assert.equal(c.field('Cardholder Name').props.value,'Muniba');assert.equal(c.field('Expiry').props.value,'12/99');assert.equal(c.field('CVV').props.value,'');assert.equal(c.pay().props.disabled,true);
});
test('a saved-shortcut failure cannot re-submit an already created payment',async()=>{const c=checkout({saveFails:true});await c.start();c.fill();c.nodes().find(n=>n.type==='Switch').props.onValueChange(true);c.render();await c.pay().props.onPress();c.render();assert.equal(c.calls.length,1);assert.match(c.alerts[0][1],/request was created/);assert.equal(c.pay().props.disabled,true);});
test('fresh pending payment or amount change blocks mutation until reviewed',async()=>{for(const options of [{pending:true},{changedAmount:true}]){const c=checkout(options);await c.start();c.fill();await c.pay().props.onPress();assert.equal(c.calls.length,0);assert.equal(c.alerts.length,1);}});
test('remaining checkout preserves the existing remaining-payment endpoint',async()=>{const c=checkout({kind:'REMAINING'});await c.start();c.fill();await c.pay().props.onPress();assert.equal(c.calls[0].type,'remaining');assert.deepEqual(c.calls[0].args,['b'.repeat(24),'card',true]);});
test('backgrounding clears card entry and prevents use of the previous account context',async()=>{const c=checkout();await c.start();c.fill();c.events.change('background');c.render();assert.equal(c.field('CVV').props.value,'');assert.equal(c.field('Test Card Number').props.value,'');assert.equal(c.pay().props.disabled,true);});

test('email receipt opt-out reaches the payment request',async()=>{const c=checkout();await c.start();c.fill();const toggle=c.nodes().find(n=>n.type==='Switch'&&n.props.accessibilityLabel==='Email me a receipt');assert.equal(toggle.props.value,true);toggle.props.onValueChange(false);c.render();await c.pay().props.onPress();assert.equal(c.calls[0].args[2],false);});
