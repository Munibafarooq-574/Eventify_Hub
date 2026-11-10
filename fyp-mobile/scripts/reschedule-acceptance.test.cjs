const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const file='components/vendorordersummary/VendorOrderSummaryIndex.tsx';
const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function load(name, context) {
 let initializer;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)initializer=node.initializer.getText(source);ts.forEachChild(node,visit);};
 visit(source);assert.ok(initializer);
 const exports={};
 vm.runInNewContext(ts.transpileModule(`exports.fn=${initializer}`,{}).outputText,{exports,...context});return exports.fn;
}
test('processing stays held until schedule resolution, including after this vendor accepts the new time',()=>{
 const order={_id:'event',vendorOrders:[{_id:'booking'}]};
 for(const [status,resolutionStatus,held] of [
  ['CHANGE_REQUESTED','PENDING',true],['ACCEPTED','PENDING',true],
  ['REJECTED','PENDING',true],['EXPIRED','PENDING',true],['REJECTED','REPLACEMENT_REQUIRED',true],
  ['ACCEPTED','APPLIED',false],['REJECTED','KEEP_ORIGINAL',false],
 ]){
  const hold=load('rescheduleHoldReason',{rescheduleRequests:[{orderId:'event',status,resolutionStatus}]});
  assert.equal(!!hold(order),held,`${status}/${resolutionStatus}`);
 }
 const hold=load('rescheduleHoldReason',{rescheduleRequests:[{orderId:'other',status:'CHANGE_REQUESTED',resolutionStatus:'PENDING'}]});
 assert.equal(hold(order),'');
});
test('existing replacement acceptance keeps its own schedule coordination',()=>{
 const hold=load('rescheduleHoldReason',{rescheduleRequests:[{orderId:'event',status:'REJECTED',resolutionStatus:'REPLACEMENT_REQUIRED'}]});
 assert.equal(hold({_id:'event',vendorOrders:[{replacementRescheduleRequestId:'request'}]}),'');
});
test('backend refusal on a stale screen refreshes orders and requests before showing the message',async()=>{
 let refreshed=0;const alerts=[];
 const mark=load('mark',{
  patchUpdateVendorOrderStatus:async()=>{throw Error('Resolve the date/time change before accepting this booking.');},
  refreshScreenData:async()=>{refreshed++;},reportMarketplaceLoadError:()=>{},
  Alert:{alert:(...args)=>alerts.push(args)},setLateAcceptanceId:()=>{},console:{log:()=>{}},
 });
 await mark('event','booking','confirmed');
 assert.equal(refreshed,1);assert.match(alerts[0][1],/Resolve the date\/time change/);
});
