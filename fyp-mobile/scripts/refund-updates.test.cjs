const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
function load(file,imports={}){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module:m,exports:m.exports,require:name=>imports[name]||require(name)});return m.exports;}
const helper=load('utils/bookingCancellation.ts');
const native={StyleSheet:{create:s=>s},View:({children})=>React.createElement('div',null,children),Text:({children})=>React.createElement('span',null,children)};
const Component=load('components/booking/BookingCancellationDetails.tsx',{'react-native':native,'@/utils/bookingCancellation':helper}).default;
const render=state=>renderToStaticMarkup(React.createElement(Component,{booking:{status:'cancelled',cancelledBy:'client',cancellationReason:'Plans changed'},refundState:state}));
const record={_id:'refund',vendorOrderId:'booking',amountPaid:1500,refundAmount:1500,withheldAmount:0};
for(const [status,label] of [['PENDING','Pending review'],['PROCESSING','Processing'],['REFUNDED','Refund confirmed'],['REJECTED','Rejected'],['NO_REFUND_DUE','No refund due']])test(`client displays ${status} without inventing repayment`,()=>{
 const html=render({record:{...record,status,refundAmount:status==='NO_REFUND_DUE'?0:1500,rejectionReason:status==='REJECTED'?'Duplicate claim':null,refundedAt:status==='REFUNDED'?'2026-10-17T12:00:00Z':null},loading:false,error:false});
 assert.match(html,new RegExp(label));assert.match(html,/Amount paid/);assert.match(html,/Refund amount/);
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
