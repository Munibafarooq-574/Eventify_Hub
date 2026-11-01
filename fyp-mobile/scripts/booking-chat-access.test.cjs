const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
for(const name of ['createConversation','getConversationList','getConversationMessages']){
 function load(token,fail=false){const calls=[];const module={exports:{}};const axios=async config=>{calls.push(config);if(fail)throw Error('temporary');return{data:{chatId:'existing',conversations:[],messages:[]}}};const code=ts.transpileModule(fs.readFileSync('services/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,console:{log:()=>{},error:()=>{throw Error('red overlay')}},require:p=>p==='axios'?axios:p==='../store'?{getSecureData:async()=>token}:{reportMarketplaceLoadError:()=>{}}});return{run:module.exports.default,calls}}
 test(name+' authenticates existing chat requests and blocks logged-out requests',async()=>{const f=load('token');await f.run('first','second');assert.equal(f.calls.length,1);assert.equal(f.calls[0].headers.Authorization,'Bearer token');const denied=load(null);await assert.rejects(denied.run('first','second'),/sign in/i);assert.equal(denied.calls.length,0)});
 test(name+' never opens raw error overlay',async()=>{const f=load('token',true);await assert.rejects(f.run('first','second'),/temporary/);assert.equal(f.calls.length,1)});
}
test('Messages route checks current entitlement before mounting the conversation list',()=>{const s=fs.readFileSync('app/vendormessages.tsx','utf8');assert.match(s,/useFocusEffect/);assert.match(s,/state==='allowed'/);assert.match(s,/Open an existing booking and tap Message/);assert.match(s,/View My Orders/);assert.match(s,/setState\('error'\)/)});
test('order Message still reuses the existing conversation and opens direct chat',()=>{const s=fs.readFileSync('components/vendorordersummary/VendorOrderSummaryIndex.tsx','utf8');assert.match(s,/createConversation\(user\._id, vendorId\)/);assert.match(s,/saveSecureData\("chatId", chatId\)/);assert.match(s,/router.push\(historyBookingId \? `\/message\?history=true&bookingId=\$\{historyBookingId\}` : `\/message`\)/)});
test('socket chat requests carry a token without creating another conversation',()=>{const s=fs.readFileSync('utils/socketService.ts','utf8');assert.match(s,/emit\('joinConversation', \{ chatId, userId, token \}\)/);assert.match(s,/emit\('sendMessage', \{ \.\.\.payload, token \}\)/);assert.match(s,/socket.on\('chatError'/)});

function service(name, data) {
 const calls=[],m={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('services/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module:m,exports:m.exports,require:p=>p==='axios'?async c=>{calls.push(c);return{data}}:p==='../store'?{getSecureData:async()=> 'token'}:{reportMarketplaceLoadError:()=>{}}});
 return{run:m.exports.default,calls};
}
test('history lookup reuses the booking-scoped read endpoint without creating a chat',async()=>{
 const f=service('createConversation',{chatId:null,readOnly:true});
 const result=await f.run('vendor','client','closed-booking');
 assert.equal(result.chatId,null);assert.equal(f.calls[0].method,'GET');
 assert.match(f.calls[0].url,/booking-history\/closed-booking\/client$/);
});
test('normal booking chat creation stays POST and preserves the peer',async()=>{
 const f=service('createConversation',{chatId:'same'});assert.equal((await f.run('vendor','client')).chatId,'same');
 assert.equal(f.calls[0].method,'POST');assert.match(f.calls[0].url,/chat\/vendor\/client$/);
});
test('message reader supplies server access mode while preserving the legacy message list',async()=>{
 const data={messages:[{_id:'previous'}],readOnly:true};const f=service('getConversationMessages',data);
 assert.equal((await f.run('chat','user',true)).readOnly,true);
 assert.equal((await f.run('chat','user'))[0]._id,'previous');
});
test('history screen and booking views compile with the existing chat screen',()=>{
 for(const p of ['components/message/MessageIndex.tsx','components/myevents/MyEventsIndex.tsx','components/vendorordersummary/VendorOrderSummaryIndex.tsx']){
  const out=ts.transpileModule(fs.readFileSync(p,'utf8'),{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,p);
 }
});

test('empty chat display separates closed history, active chat and load failure',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const source=fs.readFileSync('components/message/MessageIndex.tsx','utf8');
 const start=source.indexOf('{loading ? (',source.indexOf('{/* Chat Area */}'));
 const end=source.indexOf(': (\n              <FlatList',start);
 assert.ok(start>0&&end>start);
 const fragment=source.slice(start,end)+': null}';
 const code=ts.transpileModule(`import React from 'react';import {View,Text,TouchableOpacity,ActivityIndicator} from 'react-native';import {Ionicons} from '@expo/vector-icons';export default function Empty({loading,loadError,readOnly,messages,onRetry}){const styles={},PRIMARY='purple',setReloadCount=onRetry;return <>${fragment}</>}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const buttons=[],native={ActivityIndicator:()=>React.createElement('i',null,'Loading messages'),View:({children})=>React.createElement('div',null,children),Text:({children})=>React.createElement('span',null,children),TouchableOpacity:({children,onPress})=>{buttons.push(onPress);return React.createElement('button',null,children)}};
 const m={exports:{}};
 vm.runInNewContext(code,{module:m,exports:m.exports,require:p=>p==='react-native'?native:p==='@expo/vector-icons'?{Ionicons:()=>null}:require(p)});
 let retries=0;
 const render=props=>renderToStaticMarkup(React.createElement(m.exports.default,{loading:false,loadError:false,readOnly:true,messages:[],onRetry:fn=>{retries=fn(retries)},...props}));
 assert.match(render({}),/No previous messages for this booking/);assert.doesNotMatch(render({}),/Say hi|Start the conversation/);
 assert.match(render({readOnly:false}),/Say hi/);
 const failed=render({loadError:true});assert.match(failed,/Messages could not be loaded/);assert.doesNotMatch(failed,/No previous messages|Say hi/);
 assert.equal(buttons.length,0);assert.doesNotMatch(failed,/Try again/);
 assert.match(render({loading:true}),/Loading messages/);assert.doesNotMatch(render({loading:true}),/No previous messages|Say hi|Messages could not/);
});

test('closed history loads messages once by booking and never uses a stale chat request',async()=>{
 const src=fs.readFileSync('components/message/MessageIndex.tsx','utf8');
 const start=src.indexOf('const fetchMessages = async () => {'),end=src.indexOf('\n    fetchMessages();',start);
 const code=ts.transpileModule(src.slice(start,end)+';module.exports=fetchMessages;', {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 for(const rows of [[],[{_id:'old',message:'Hello'}]]){
  const calls=[],loaded=[],errors=[],m={exports:{}};
  const context={module:m,isMounted:true,history:'true',bookingId:'closed',chatIdRef:{current:''},receiverIdRef:{current:''},userRef:{current:null},readOnlyRef:{current:true},socket:{connected:true},
   setLoading:()=>{},setLoadError:v=>{if(v)errors.push(v)},setReadOnly:()=>{},setReceiverName:()=>{},setMessages:rows=>loaded.push(rows),getUserData:async()=>({_id:'vendor'}),getSecureData:async key=>key==='receiverId'?'client':key==='chatId'?'stale-chat':'Client',saveSecureData:async()=>{},registerUser:()=>{},getUserPresence:async()=>({}),setPresence:()=>{},
   createConversation:async(...args)=>{calls.push(args);return{chatId:rows.length?'client-vendor':null,messages:rows,readOnly:true}},getConversationMessages:async()=>{throw Error('must not call normal chat')},getPinnedMessages:()=>{throw Error('history must not request pins')},setPinnedMessages:()=>{},sortDesc:r=>r,dedupeById:r=>r,deriveStatus:()=> 'sent',markVisibleMessagesSeen:()=>{throw Error('history must not send read updates')},joinConversation:()=>{throw Error('history must not join live chat')},reportMarketplaceLoadError:()=>{errors.push('failed')}};
  vm.runInNewContext(code,context);await m.exports();
  assert.equal(calls.length,1);assert.equal(calls[0].join(','),'vendor,client,closed');assert.equal(errors.length,0);assert.equal(loaded[0].length,rows.length);
 }
});

function messagingRoute(user,access,fail=false){
 const React=require('react');let focus,subscriptionCalls=0,mounted=true,clean;
 const state=['loading',0];let hook=0;
 const code=ts.transpileModule(fs.readFileSync('app/vendormessages.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const m={exports:{}};
 const imports={'react':{...React,useState:init=>{const i=hook++;return[state[i],v=>state[i]=v]},useCallback:f=>f},'expo-router':{router:{replace:()=>{}},useFocusEffect:f=>{focus=f}},'react-native':{View:()=>null,Text:()=>null,TouchableOpacity:()=>null,ActivityIndicator:()=>null},'@/components/vendormessages/VendorMessagesIndex':{default:()=>null},'@/store':{getUserData:async()=>user},'@/services/getSubscriptionAccessState':{getSubscriptionAccessState:async()=>{subscriptionCalls++;if(fail)throw Error('offline');return access}}};
 vm.runInNewContext(code,{module:m,exports:m.exports,Date,require:p=>imports[p]||require(p)});m.exports.default();clean=focus();
 return{state,ready:()=>new Promise(r=>setImmediate(r)),calls:()=>subscriptionCalls,blur:()=>clean()};
}
test('client opens the conversation list without any vendor subscription request',async()=>{
 for(const role of ['Organizer','Client','organizer']){
  const f=messagingRoute({_id:'client',role},null,true);await f.ready();assert.equal(f.state[0],'allowed');assert.equal(f.calls(),0);
 }
});
test('vendor messaging still checks active and expired subscription access',async()=>{
 for(const [active,expected] of [[true,'allowed'],[false,'restricted']]){
  const f=messagingRoute({_id:'vendor',role:'Vendor'},{accessAllowed:active,subscriptionRequired:!active,subscription:{endDate:active?'2099-01-01':'2000-01-01'}});
  await f.ready();assert.equal(f.state[0],expected);assert.equal(f.calls(),1);
 }
});
test('vendor verification failure and signed-out sessions do not open a conversation list',async()=>{
 const failed=messagingRoute({_id:'vendor',role:'Vendor'},null,true);await failed.ready();assert.equal(failed.state[0],'error');
 const signedOut=messagingRoute(null,null);await signedOut.ready();assert.equal(signedOut.state[0],'error');assert.equal(signedOut.calls(),0);
});

test('chat footer stays hidden until access is loaded and never labels a load failure closed',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const source=fs.readFileSync('components/message/MessageIndex.tsx','utf8');
 const start=source.indexOf('{!loading && !loadError && (readOnly ?');
 const end=source.indexOf('\n          </>',start);
 assert.ok(start>0&&end>start);
 const fragment=source.slice(start,end);
 const code=ts.transpileModule(`import React from 'react';import {View,Text,TouchableOpacity,TextInput} from 'react-native';import {Ionicons} from '@expo/vector-icons';const VoiceRecorderButton=()=>null;export default function Footer({loading,loadError,readOnly}){const styles={},PRIMARY='purple',uploading=false,message='',router={push:()=>{}},handleAttachPress=()=>{},handleChangeMessage=()=>{},handleSendMessage=()=>{},sendVoiceMessage=()=>{};return <>${fragment}</>}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const native={View:({children})=>React.createElement('div',null,children),Text:({children})=>React.createElement('span',null,children),TouchableOpacity:({children})=>React.createElement('button',null,children),TextInput:({placeholder})=>React.createElement('input',{placeholder})};
 const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,require:p=>p==='react-native'?native:p==='@expo/vector-icons'?{Ionicons:()=>null}:require(p)});
 const render=props=>renderToStaticMarkup(React.createElement(m.exports.default,{loading:false,loadError:false,readOnly:false,...props}));
 for(const readOnly of [true,false]){
  assert.equal(render({loading:true,readOnly}),'');assert.equal(render({loadError:true,readOnly}),'');
 }
 assert.match(render({}),/Write a message/);assert.doesNotMatch(render({}),/Chat history only/);
 assert.match(render({readOnly:true}),/Chat history only/);assert.doesNotMatch(render({readOnly:true}),/Write a message/);
});
