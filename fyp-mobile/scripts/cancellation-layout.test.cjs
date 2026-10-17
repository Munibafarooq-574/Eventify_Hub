// Run with: node --test scripts/cancellation-layout.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');
function screen({width=390,height=844,fontScale=1,os='android',reason='Typing a reason'}={}) {
  const effects=[],listeners={},scrolls=[],refs=[],cleanups=[];
  let stateIndex=0,frameId=0,cancelCalls=0;
  const preview={eligible:true,previewToken:'signed',amountPaid:1500,cancellationPolicyApplied:'REFUNDABLE',hoursBeforeEvent:548,refundPercentage:100,refundAmount:1500,withheldAmount:0,policyRevision:2};
  const states=[preview,false,false,'',reason,0];
  const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:initial=>[stateIndex<states.length?states[stateIndex++]:initial,()=>{}],useRef:value=>{const ref={current:value};refs.push(ref);return ref;},useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
  const native=Object.fromEntries(['ActivityIndicator','KeyboardAvoidingView','Modal','ScrollView','Text','TextInput','TouchableOpacity','View'].map(name=>[name,name]));
  Object.assign(native,{Platform:{OS:os},useWindowDimensions:()=>({width,height,fontScale}),StyleSheet:{create:value=>value,hairlineWidth:1},Alert:{alert(){}},Keyboard:{dismiss(){},addListener:(name,callback)=>{listeners[name]=callback;return{remove(){delete listeners[name]}}}}});
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/cancellation/ClientCancellationReview.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal(code.diagnostics.length,0);
  const module={exports:{}};
  vm.runInNewContext(code.outputText,{module,exports:module.exports,requestAnimationFrame:fn=>{fn();return ++frameId;},cancelAnimationFrame(){},require:name=>{
    if(name==='react')return React;
    if(name==='react-native')return native;
    if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:44,bottom:34,left:0,right:0})};
    if(name==='@/utils/bookingCancellation')return{formatNoticeHours:()=> '22 days 20 hours'};
    if(name==='@/services/calculateRefund')return{default:async()=>preview,__esModule:true};
    if(name==='@/services/cancelConfirmedBooking')return{default:async()=>{cancelCalls++;},__esModule:true};
    throw Error(name);
  }});
  const tree=module.exports.default({vendorOrderId:'booking',vendorName:'A long vendor business name that wraps',onClose(){},onCancelled:async()=>{}});
  const nodes=[];
  function visit(node){if(!node||typeof node!=='object')return;if(typeof node.type==='function')return visit(node.type(node.props));nodes.push(node);for(const child of node.props?.children?.flat(Infinity)||[])visit(child);}
  visit(tree);
  const find=name=>nodes.find(n=>n.type===name);
  const scroll=find('ScrollView');scroll.props.ref.current={scrollTo:value=>scrolls.push(value)};
  effects[0](); // keyboard subscription only; loading API is independently tested
  return{nodes,find,listeners,scrolls,cancelCalls:()=>cancelCalls};
}
const flatten=value=>Object.assign({},...[value].flat(Infinity).filter(Boolean));
for(const dimensions of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1024,height:1366},{width:1366,height:768},{width:320,height:568,fontScale:1.6}]){
  test(`review layout stays bounded and scrollable at ${dimensions.width}x${dimensions.height}, font ${dimensions.fontScale||1}`,()=>{
    const s=screen(dimensions);
    const sheet=s.nodes.find(n=>n.props.accessibilityViewIsModal);
    const style=flatten(sheet.props.style);
    assert.equal(style.maxWidth,640);assert.equal(style.width,'100%');assert.equal(style.flexShrink,1);
    assert.equal(flatten(s.find('ScrollView').props.style).flex,1);
    const input=s.find('TextInput');assert.equal(input.props.maxLength,500);assert.equal(input.props.multiline,true);assert.equal(input.props.value,'Typing a reason');
    assert.equal(flatten(input.props.style).fontSize,16);
    const rows=s.nodes.filter(n=>n.type==='View'&&flatten(n.props.style).justifyContent==='space-between');
    assert.equal(rows.length,7);
    for(const row of rows)assert.equal(flatten(row.props.style).flexDirection,(dimensions.width<360||dimensions.fontScale>=1.4)?'column':'row');
  });
}
for(const os of ['android','ios'])test(`${os}: keyboard appearance and viewport resize reveal the reason without cancelling`,()=>{
  const s=screen({os});
  assert.equal(s.find('KeyboardAvoidingView').props.behavior,os==='ios'?'padding':'height');
  const reason=s.nodes.find(n=>n.type==='View'&&n.props.onLayout);
  reason.props.onLayout({nativeEvent:{layout:{y:540}}});
  const input=s.find('TextInput');input.props.onFocus();
  s.listeners.keyboardDidShow();s.find('ScrollView').props.onLayout();
  assert.equal(s.scrolls.length,3);for(const call of s.scrolls)assert.equal(call.y,528);
  input.props.onBlur();s.listeners.keyboardDidShow();assert.equal(s.scrolls.length,3);
  assert.equal(s.cancelCalls(),0);
});

test('confirmation remains disabled until the required reason contains text', () => {
  for (const reason of ['', '   ', 'Plans changed']) {
    const s=screen({reason});
    const button=s.nodes.find(n=>n.type==='TouchableOpacity'&&n.props.children.flat(Infinity).some(c=>c?.props?.children?.includes('Confirm Cancellation')));
    assert.equal(button.props.disabled,!reason.trim());
  }
});
