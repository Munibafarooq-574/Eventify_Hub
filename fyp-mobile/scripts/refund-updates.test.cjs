const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
function load(file,imports={}){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module:m,exports:m.exports,require:name=>imports[name]||require(name)});return m.exports;}
const helper=load('utils/bookingCancellation.ts');
const native={StyleSheet:{create:s=>s},View:({children})=>React.createElement('div',null,children),Text:({children})=>React.createElement('span',null,children)};
const Component=load('components/booking/BookingCancellationDetails.tsx',{'react-native':native,'@/utils/bookingCancellation':helper}).default;
const render=state=>renderToStaticMarkup(React.createElement(Component,{booking:{status:'cancelled',cancelledBy:'client',cancellationReason:'Plans changed'},refundState:state}));
const record={_id:'refund',vendorOrderId:'booking',amountPaid:1500,refundAmount:1500,withheldAmount:0};
for(const [status,label] of [['PENDING','Pending review'],['PROCESSING','Processing'],['REFUNDED','Refund confirmed'],['REJECTED','Rejected'],['NO_REFUND_DUE','No refund due']])test(`client displays ${status} without inventing repayment`,()=>{
 const html=render({record:{...record,status,refundAmount:status==='NO_REFUND_DUE'?0:1500,rejectionReason:status==='REJECTED'?'Duplicate claim':null,refundedAt:status==='REFUNDED'?'2026-10-17T12:00:00Z':null},loading:false,error:false});
 assert.match(html,new RegExp(label));assert.match(html,/Amount paid/);assert.match(html,status==='REJECTED'?/Requested refund/:/Refund amount/);
 if(status==='REFUNDED')assert.match(html,/Confirmed at/);else assert.doesNotMatch(html,/Your refund settlement has been confirmed|Confirmed at/);
 if(status==='REJECTED')assert.match(html,/Duplicate claim/);
});
test('zero refund pending closure does not promise payment',()=>{const html=render({record:{...record,status:'PENDING',refundAmount:0},loading:false,error:false});assert.match(html,/No refund due/);assert.match(html,/awaiting review/);assert.doesNotMatch(html,/refund is being processed|settlement has been confirmed/);});
test('loading, failure and absent records stay distinct',()=>{
 assert.match(render({loading:true,error:false}),/Loading refund/);
 assert.match(render({loading:false,error:true}),/Unable to load/);
 assert.match(render({loading:false,error:false}),/No refund record/);
 assert.match(render({record:{...record,status:'PROCESSING'},loading:false,error:true}),/last loaded update/);
});
test('refund reads authenticate and pass no client-controlled ownership query',async()=>{
 const calls=[];const axios={get:async(url,options)=>{calls.push({url,options});return{data:[record]}}};
 const imports={'axios':axios,'../store':{getSecureData:async()=> 'token'},'./apiConfig':{API_BASE_URL:'https://backend.invalid'}};
 const api=load('services/getClientRefunds.ts',imports).default;assert.equal((await api()).length,1);assert.equal(calls[0].url,'https://backend.invalid/cancellation/refunds');assert.equal(calls[0].options.headers.Authorization,'Bearer token');
 imports['../store']={getSecureData:async()=>null};await assert.rejects(load('services/getClientRefunds.ts',imports).default(),/sign in again/);assert.equal(calls.length,1);
});
test('notification reads use the signed-in token and block unsigned requests',async()=>{
 const calls=[];const axios=async config=>{calls.push(config);return{data:{data:[]}}};
 const imports={'axios':axios,'../store':{getSecureData:async()=> 'session-token'}};
 await load('services/getNotifications.ts',imports).default('client');assert.equal(calls[0].headers.Authorization,'Bearer session-token');
 imports['../store']={getSecureData:async()=>null};await assert.rejects(load('services/getNotifications.ts',imports).default('client'),/sign in again/);assert.equal(calls.length,1);
});

test('rejected refund shows requested amount and zero paid, never the old retained split',()=>{const html=render({record:{...record,status:'REJECTED'},loading:false,error:false});assert.match(html,/Requested refund/);assert.match(html,/Refund paid/);assert.doesNotMatch(html,/Amount retained/);});
test('vendor uses the shared panel with penalty and payout clarification',()=>{const html=renderToStaticMarkup(React.createElement(Component,{audience:'vendor',booking:{status:'cancelled_by_vendor',cancelledBy:'vendor'},refundState:{record:{...record,status:'REJECTED',vendorPenalty:[{amount:300,percentage:5}]},loading:false,error:false}}));assert.match(html,/Vendor penalty/);assert.match(html,/300/);assert.match(html,/Payout eligibility/);assert.match(html,/Requested refund/);});
function refundHook(fetcher){
 const states=[];let index=0,focus,timer,foreground;const app={currentState:'active',addEventListener:(_name,cb)=>{foreground=cb;return{remove(){}}}};
 const react={useRef:value=>({current:value}),useCallback:fn=>fn,useState:value=>{const i=index++;states[i]=value;return[value,next=>{states[i]=next}];}};
 const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../hooks/useRefundUpdates.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports:m.exports,module:m,require:name=>({'react':react,'react-native':{AppState:app},'expo-router':{useFocusEffect:cb=>{focus=cb}},'@/services/getClientRefunds':fetcher}[name]),setInterval:cb=>{timer=cb;return 1},clearInterval(){}});
 m.exports.default();return{states,start:()=>focus(),poll:()=>timer(),app,foreground:()=>foreground('active')};
}
test('shared refund polling pauses in background and refreshes on foreground',async()=>{
 let calls=0;const h=refundHook(async()=>{calls++;return[record]});const stop=h.start();await new Promise(setImmediate);assert.equal(calls,1);h.app.currentState='background';h.poll();assert.equal(calls,1);h.app.currentState='active';h.foreground();await new Promise(setImmediate);assert.equal(calls,2);assert.equal(h.states[0].booking._id,'refund');stop();
});
test('leaving the screen blocks a late refund response from an old session',async()=>{
 let resolve;const h=refundHook(()=>new Promise(r=>{resolve=r}));const stop=h.start();stop();resolve([record]);await new Promise(setImmediate);assert.equal(Object.keys(h.states[0]).length,0);
});
