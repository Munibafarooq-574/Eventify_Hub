const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
function screen({user={_id:'signed-in-vendor'},edit='true',failSave=false,failStorage=false}={}) {
 const calls=[],alerts=[],navigation=[];let stateIndex=0;
 const states=[['BIRTHDAY'],['Scheduled'],'YES','Birthday cakes','PERCENTAGE','50','YES','PARTIALLY REFUNDABLE','3000','Cake description','Notes'];
 const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),useEffect(){},useState:()=>[states[stateIndex++],()=>{}]};
 const natives=Object.fromEntries(['View','Text','TextInput','TouchableOpacity','ScrollView'].map(n=>[n,n]));natives.StyleSheet={create:s=>s};natives.Alert={alert:(...args)=>alerts.push(args)};
 const api=name=>async(id,dto)=>{calls.push({name,id,dto});if(failSave)throw Error('Network failed');};
 const imports={react,'react-native':natives,'@expo/vector-icons':{FontAwesome5:'Icon'},'expo-router':{useLocalSearchParams:()=>({edit,userId:'route-other-vendor'}),router:{back:()=>navigation.push('back'),replace:p=>navigation.push(p)}},
 '@/store':{getUserData:async()=>{if(failStorage)throw Error('Invalid stored data');return user;},getSecureData:()=>{throw Error('Must not read user from SecureStore');}},
 '@/services/postCakeBusinessDetails':api('post'),'@/services/patchBusinessDetails':api('patch'),'@/services/submitVendorProfileForReview':api('review'),axios:{get:()=>{throw Error('No request expected while rendering');}}};
 const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/bdcakes/BDCakesIndex.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});assert.equal(code.diagnostics.length,0);
 vm.runInNewContext(code.outputText,{module:mod,exports:mod.exports,console:{log(){}},require:name=>{if(!(name in imports))throw Error(name);return imports[name];}});
 const tree=mod.exports.default();
 function find(node){if(!node||typeof node!=='object')return; if(node.type==='TouchableOpacity'&&node.props.children.flat(Infinity).some(c=>c?.type==='Text'&&['Update Details','Save & Continue'].includes(c.props.children[0])))return node;for(const child of node.props?.children?.flat(Infinity)||[]){const found=find(child);if(found)return found;}}
 return{calls,alerts,navigation,async save(){find(tree).props.onPress();await new Promise(resolve=>setImmediate(resolve));}};
}
test('editing uses the signed-in AsyncStorage user and preserves the existing PATCH payload',async()=>{
 const s=screen();await s.save();assert.equal(s.calls.length,1);assert.equal(s.calls[0].name,'patch');assert.equal(s.calls[0].id,'signed-in-vendor');assert.equal(s.calls[0].dto.cancellationPolicy,'PARTIALLY REFUNDABLE');assert.equal(s.calls[0].dto.downPayment,50);assert.equal(s.calls[0].dto.minimumPrice,3000);assert.equal(s.calls[0].dto.deliveryToHome,true);assert.deepEqual(s.navigation,['back']);
});
test('new setup still posts details then submits the vendor profile for review',async()=>{
 const create=screen({edit:'false'});await create.save();assert.deepEqual(create.calls.map(c=>c.name),['post','review']);assert.deepEqual(create.navigation,['/vendorprofilepending']);
});
for(const user of [null,{}, {_id:''}, {_id:'   '}, {_id:123}])test(`missing/invalid user ${JSON.stringify(user)} blocks all save requests`,async()=>{
 const s=screen({user});await s.save();assert.equal(s.calls.length,0);assert.equal(s.alerts[0][0],'Sign in required');assert.equal(s.navigation.length,0);
});
test('a failed save does not show success or navigate away',async()=>{const s=screen({failSave:true});await s.save();assert.equal(s.alerts[0][0],'Error');assert.equal(s.navigation.length,0);});
test('unreadable storage does not submit an update with a route-supplied user ID',async()=>{const s=screen({failStorage:true});await s.save();assert.equal(s.calls.length,0);assert.equal(s.navigation.length,0);});
