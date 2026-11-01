const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
for(const name of ['createConversation','getConversationList','getConversationMessages']){
 function load(token,fail=false){const calls=[];const module={exports:{}};const axios=async config=>{calls.push(config);if(fail)throw Error('temporary');return{data:{chatId:'existing',conversations:[],messages:[]}}};const code=ts.transpileModule(fs.readFileSync('services/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,console:{log:()=>{},error:()=>{throw Error('red overlay')}},require:p=>p==='axios'?axios:p==='../store'?{getSecureData:async()=>token}:{reportMarketplaceLoadError:()=>{}}});return{run:module.exports.default,calls}}
 test(name+' authenticates existing chat requests and blocks logged-out requests',async()=>{const f=load('token');await f.run('first','second');assert.equal(f.calls.length,1);assert.equal(f.calls[0].headers.Authorization,'Bearer token');const denied=load(null);await assert.rejects(denied.run('first','second'),/sign in/i);assert.equal(denied.calls.length,0)});
 test(name+' never opens raw error overlay',async()=>{const f=load('token',true);await assert.rejects(f.run('first','second'),/temporary/);assert.equal(f.calls.length,1)});
}
test('Messages route checks current entitlement before mounting the conversation list',()=>{const s=fs.readFileSync('app/vendormessages.tsx','utf8');assert.match(s,/useFocusEffect/);assert.match(s,/state==='allowed'/);assert.match(s,/Open an existing booking and tap Message/);assert.match(s,/View My Orders/);assert.match(s,/setState\('error'\)/)});
test('order Message still reuses the existing conversation and opens direct chat',()=>{const s=fs.readFileSync('components/vendorordersummary/VendorOrderSummaryIndex.tsx','utf8');assert.match(s,/createConversation\(user\._id, vendorId, historyBookingId\)/);assert.match(s,/saveSecureData\("chatId", chatId\)/);assert.match(s,/router.push\(historyBookingId \? `\/message\?history=true` : `\/message`\)/)});
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
 const start=source.indexOf('{!loading && loadError ? (');
 const end=source.indexOf(': (\n              <FlatList',start);
 assert.ok(start>0&&end>start);
 const fragment=source.slice(start,end)+': null}';
 const code=ts.transpileModule(`import React from 'react';import {View,Text,TouchableOpacity} from 'react-native';import {Ionicons} from '@expo/vector-icons';export default function Empty({loading,loadError,readOnly,messages,onRetry}){const styles={},PRIMARY='purple',setReloadCount=onRetry;return <>${fragment}</>}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const buttons=[],native={View:({children})=>React.createElement('div',null,children),Text:({children})=>React.createElement('span',null,children),TouchableOpacity:({children,onPress})=>{buttons.push(onPress);return React.createElement('button',null,children)}};
 const m={exports:{}};
 vm.runInNewContext(code,{module:m,exports:m.exports,require:p=>p==='react-native'?native:p==='@expo/vector-icons'?{Ionicons:()=>null}:require(p)});
 let retries=0;
 const render=props=>renderToStaticMarkup(React.createElement(m.exports.default,{loading:false,loadError:false,readOnly:true,messages:[],onRetry:fn=>{retries=fn(retries)},...props}));
 assert.match(render({}),/No previous messages for this booking/);assert.doesNotMatch(render({}),/Say hi|Start the conversation/);
 assert.match(render({readOnly:false}),/Say hi/);
 const failed=render({loadError:true});assert.match(failed,/Messages could not be loaded/);assert.doesNotMatch(failed,/No previous messages|Say hi/);
 buttons.at(-1)();assert.equal(retries,1);
 assert.equal(render({loading:true}),'');
});
