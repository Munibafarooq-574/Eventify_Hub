const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(failure){const source=fs.readFileSync('components/OrderReview/OrderReviewIndex.tsx','utf8');const start=source.indexOf('  const handleCheckout = async () => {');const end=source.indexOf('  // -----------------------------------------\n  // Loading',start);const code=ts.transpileModule(source.slice(start,end)+'\nmodule.exports=handleCheckout;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const cleaned=[],alerts=[],errors=[],deleted=[],navigation=[],loading=[],toasts=[],requests=[];const context={clearExpiredReplacementCart:async(_draft,cart,event)=>cleaned.push({cart,event}),module:{exports:{}},placingOrder:false,refreshing:false,refreshNotice:'',setRefreshNotice:v=>{context.refreshNotice=v},isConnectionError:error=>/connection interrupted/i.test(error.message),OFFLINE_NOTICE:'No internet connection. Reconnect and pull down to refresh.',checkoutLock:{current:false},bookingSubmitted:{current:false},setCheckoutError:v=>errors.push(v),setPlacingOrder:v=>loading.push(v),getUserData:async()=>({_id:'client'}),getSecureData:async()=>JSON.stringify({replacementVendorOrderId:'cancelled',eventId:'event',eventDate:'2026-10-24',startTime:'14:30',eventName:'Deadline test',guests:15,eventCityId:'city',eventAddress:'Venue'}),cartData:{vendors:[{vendor:{_id:'vendor'},packages:[{_id:'package',packageName:'Package',price:1000,quantity:1}]}]},appliedPromotions:{},getPromotionKey:()=> 'key',getResolvedServiceWindow:()=>null,reportMarketplaceLoadError:()=>{},postPlaceOrder:async p=>{requests.push(p);if(failure)throw Error(failure);return{_id:'same-event'}},cancelCartReminder:async()=>{},deleteSecureData:async key=>deleted.push(key),router:{replace:p=>navigation.push(p)},Toast:{show:p=>toasts.push(p)},Alert:{alert:(...args)=>alerts.push(args)}};context.draft={getSession:async()=>{const user=await context.getUserData();return user&&{userId:user._id,token:"token"}},get:key=>key==='cartData'?JSON.stringify(context.cartData):context.getSecureData(),getRevision:()=>1,delete:context.deleteSecureData,isCurrent:()=>true};context.promotionWriteLock={current:false};context.applyingCouponId=null;context.applyingDiscountCodeKey=null;context.loadedDraft={get current(){return {cart:JSON.stringify(context.cartData),event:context.eventSnapshot}}};context.getSecureData().then(value=>{context.eventSnapshot=value});vm.runInNewContext(code,context);return{cleaned,...context,run:context.module.exports,alerts,deleted,navigation,loading,toasts,requests,errors,context};}
test('expired replacement cleans its cart, shows deadline message and unlocks button',async()=>{const message='Replacement vendors can only be selected before the event starts.';const f=load(message);await f.run();assert.equal(f.errors.at(-1),message);assert.equal(f.deleted.length,0);assert.equal(f.navigation.length,0);assert.deepEqual(f.loading,[true,false]);assert.equal(f.requests[0].replacementVendorOrderId,'cancelled');assert.equal(f.cleaned.length,1);assert.equal(f.cleaned[0].event.replacementVendorOrderId,'cancelled')});
test('network failure also produces visible feedback without deleting checkout data',async()=>{const f=load('Booking could not be submitted right now. Your cart is saved. Please try again shortly.');await f.run();assert.match(f.errors.at(-1),/cart is saved/);assert.equal(f.alerts[0][0],'Booking not submitted');assert.equal(f.deleted.length,0);assert.equal(f.loading.at(-1),false)});
test('successful checkout keeps existing success and cleanup behavior',async()=>{const f=load();await f.run();assert.equal(f.alerts.length,0);assert.deepEqual(f.deleted,[]);assert.equal(f.requests[0].bookingDraftRevision,1);assert.equal(f.navigation.length,1);assert.equal(f.navigation[0].pathname,'/OrderSummary');assert.deepEqual(JSON.parse(f.navigation[0].params.chatVendors),[{id:'vendor',name:'Vendor',avatar:''}]);assert.equal(f.toasts[0].type,'success');await f.run();assert.equal(f.requests.length,1)});
test('booking POST has a bounded timeout and is not automatically retried',()=>{const s=fs.readFileSync('services/postPlaceOrder.ts','utf8');assert.match(s,/timeout: 30000/);assert.equal((s.match(/await axios\(config\)/g)||[]).length,1)});

test('missing session and empty cart show visible feedback and release the button',async()=>{
 const missing=load();missing.context.getUserData=async()=>null;await missing.run();assert.match(missing.errors.at(-1),/sign in again/);assert.equal(missing.loading.at(-1),false);
 const empty=load();empty.cartData.vendors=[];await empty.run();assert.match(empty.errors.at(-1),/cart is empty/);assert.equal(empty.loading.at(-1),false);assert.equal(empty.requests.length,0);
});
test('empty server response no longer silently returns',async()=>{const f=load();f.context.postPlaceOrder=async()=>undefined;await f.run();assert.match(f.errors.at(-1),/confirmation was not received/);assert.equal(f.deleted.length,0)});
test('repeated taps submit only once while checkout is in flight',async()=>{const f=load('Event has started');await Promise.all([f.run(),f.run()]);assert.equal(f.requests.length,1);assert.equal(f.checkoutLock.current,false)});
test('checkout error is rendered beside the actual submit button',()=>{const s=fs.readFileSync('components/OrderReview/OrderReviewIndex.tsx','utf8');assert.match(s,/accessibilityRole="alert"/);assert.match(s,/Booking not submitted/);assert.match(s,/\{checkoutError\}/);assert.match(s,/if \(!response\) throw new Error/)});

test('expired replacement offers My Events navigation while other errors retain retry',()=>{const s=fs.readFileSync('components/OrderReview/OrderReviewIndex.tsx','utf8');const expression=s.match(/const replacementDeadlinePassed = (.+);/)[1];const expired=vm.runInNewContext(expression,{checkoutError:'Replacement is available only before the event starts.'});assert.equal(expired,true);assert.equal(vm.runInNewContext(expression,{checkoutError:'Network unavailable'}),false);assert.match(s,/replacementDeadlinePassed \? \(\) => router.replace\('\/myevents'\) : handleCheckout/);assert.match(s,/'Back to My Events' : 'Confirm & Book Now'/)});

test('booking success offers one chat per vendor, including multi-package orders', async () => {
 const f = load();
 f.cartData.vendors.push({ vendor: {_id:'vendor'}, packages: [{ _id:'second-package', packageName:'Extra', price:400 }] });
 f.cartData.vendors.push({ vendor: {_id:'cake', contactDetails:{brandName:'Cake Shop'}}, packages:[{_id:'cake-package',packageName:'Cake',price:2000}] });
 await f.run();
 assert.deepEqual(JSON.parse(f.navigation[0].params.chatVendors).map(vendor=>[vendor.id,vendor.name]), [['vendor','Vendor'],['cake','Cake Shop']]);
});

test('a lost checkout response recovers only the matching committed replacement', async () => {
 const source=fs.readFileSync('services/postPlaceOrder.ts','utf8');
 const start=source.indexOf('async function findSubmittedBooking');
 const end=source.indexOf('/**',start);
 const booking={vendorId:{_id:'vendor'},packageId:'package',replacesVendorOrderId:'old'};
 const order={eventId:'event',vendorOrders:[booking]};
 const lookup=vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nfindSubmittedBooking;',{}).outputText,
  {getVendorOrders:async()=>[order]});
 const payload={organizerId:'client',eventId:'event',replacementVendorOrderId:'old',services:[{vendorId:'vendor',packageId:'package'}]};
 assert.equal(await lookup(payload),order);
 assert.equal(await lookup({...payload,replacementVendorOrderId:'other'}),undefined);
});

test('cart reminder schedules once across repeated attempts and can be cancelled', async () => {
 const source=fs.readFileSync('services/cartReminder.ts','utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const scheduled=[],cancelled=[],channels=[],saved=new Map();
 const mocks={
  '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async key=>saved.get(key),setItem:async(key,value)=>saved.set(key,value)}},
  'expo-notifications':{
   getPermissionsAsync:async()=>({granted:true}),
   setNotificationChannelAsync:async (id, channel)=>channels.push({id, channel}),
   AndroidImportance:{HIGH:4},
   scheduleNotificationAsync:async notification=>scheduled.push(notification),
   cancelScheduledNotificationAsync:async id=>cancelled.push(id),
   dismissNotificationAsync:async()=>{},
   SchedulableTriggerInputTypes:{TIME_INTERVAL:'timeInterval'},
  },
  'react-native':{Platform:{OS:'android'}},
 };
 const exports={};
 vm.runInNewContext(code,{exports,require:name=>mocks[name],console});
 const schedule=()=>exports.scheduleCartReminder('client','event',async()=>true);
 await Promise.all([schedule(),schedule()]);
 await exports.cancelCartReminder();
 await schedule();
 assert.equal(scheduled.length,1);
 assert.equal(scheduled[0].trigger.seconds,3600);
 assert.equal(channels.length,1);
 assert.equal(scheduled[0].trigger.channelId,channels[0].id);
 assert.equal(channels[0].channel.importance,4);
 assert.equal(cancelled[0],scheduled[0].identifier);
});

test('a connection failure shows the offline notice and preserves checkout data', async () => {
 const f = load('Connection interrupted. Your cart is saved.');
 await f.run();
 assert.match(f.context.refreshNotice, /No internet connection/);
 assert.equal(f.deleted.length, 0);
 assert.equal(f.alerts.length, 0);
 assert.equal(f.loading.at(-1), false);
 await f.run();
 assert.equal(f.requests.length, 1);
});

test('pull after reconnect rechecks the saved duration and updates price without changing the cart selection', async () => {
 const source = fs.readFileSync('components/OrderReview/OrderReviewIndex.tsx', 'utf8');
 const start = source.indexOf('  const { refreshing, refreshControl } = usePullToRefresh');
 const end = source.indexOf('  const handleCheckout', start);
 const window = {startDateTime:'2026-11-09T10:00:00Z',endDateTime:'2026-11-09T11:00:00Z'};
 const pkg = {_id:'package', packageName:'Photography', durationMinutes:60, quantity:2, price:1000, requiredServiceWindow:window};
 const cartData = {vendors:[{vendor:{_id:'vendor'}, packages:[pkg]}]};
 let reload, notice, updated, checkedDuration;
 let offline = true;
 const context = {
  usePullToRefresh: fn => { reload = fn; return {}; },
  PRIMARY:'#780C60', OFFLINE_NOTICE:'No internet connection.',
  cartData, eventDetails:{eventDate:'2026-11-09',startTime:'15:00',eventDurationMinutes:120,eventCityId:'city',durationMinutes:120},
  checkoutLock:{current:false}, applyingCouponId:null, applyingDiscountCodeKey:null, connectivityRequest:{current:0},
  promotionWriteLock:{current:false}, replacementDeadlinePassed:false,
  loadedDraft:{current:{cart:JSON.stringify(cartData),event:'event'}},
  draft:{get:async key=>key==='cartData'?JSON.stringify(cartData):'event',getRevision:()=>1},
  getCartPromotions:()=>({}),
  getVendorPackagesList:async () => { if (offline) throw new TypeError('Network request failed'); return [{_id:'package', price:1200}]; },
  resolvePackagePrice: latest => ({price:latest.price}),
  checkReviewPackageAvailability:async input => { checkedDuration = input.eventDurationMinutes; return true; },
  getPromotionKey:()=> 'vendor:package', getPackageAmount:()=>2400,
  setCartData:value=>{updated=value;}, setRefreshNotice:value=>{notice=value;},
  setAppliedPromotions:()=>{}, setCheckoutError:()=>{}, reportMarketplaceLoadError:()=>{},
  isConnectionError:error=>error instanceof TypeError,
 };
 vm.runInNewContext(ts.transpileModule(source.slice(start,end), {}).outputText,context);
 await reload();
 assert.match(notice,/No internet connection/);
 assert.equal(updated,undefined);
 offline = false;
 await reload();
 assert.equal(notice,'');
 assert.equal(checkedDuration,60);
 assert.equal(updated.vendors[0].packages[0].price,1200);
 assert.equal(updated.vendors[0].packages[0].quantity,2);
 assert.equal(updated.vendors[0].packages[0].requiredServiceWindow,window);
 assert.equal(pkg.price,1000);
});


test('a second device receives an already-booked message and can open My Events', async () => {
 const f=load();
 f.context.postPlaceOrder=async()=>{throw Object.assign(new Error('This event has already been booked'),{checkoutConflict:'EVENT_ALREADY_BOOKED'});};
 await f.run();
 assert.equal(f.alerts[0][0],'Already booked');
 f.alerts[0][2][0].onPress();
 assert.equal(f.navigation[0],'/myevents');
 assert.equal(f.deleted.length,0);
});

test('coupon apply and remove persist the selected offer with the exact reviewed revision', async () => {
 const source = fs.readFileSync('components/OrderReview/OrderReviewIndex.tsx', 'utf8');
 const helper = source.slice(source.indexOf('function getCartPromotions('), source.indexOf('const OrderReviewScreen ='));
 const save = source.slice(source.indexOf('const savePromotion ='), source.indexOf('const handleApplyPublicCoupon'));
 const writes = [];
 let revision = 7;
 let promotions;
 const cart = {vendors:[{vendor:{_id:'vendor'},packages:[{packageId:'package'}]}]};
 const context = {
  module:{exports:{}}, promotionWriteLock:{current:false}, checkoutLock:{current:false},
  loadedDraft:{current:{cart:JSON.stringify(cart),event:'event',revision}},
  draft:{isCurrent:()=>true,getRevision:()=>revision,save:async(key,raw,expected)=>{
   writes.push([key,JSON.parse(raw),expected]);
   revision++;
  }},
  setAppliedPromotions:value=>{promotions=value;},
 };
 vm.runInNewContext(ts.transpileModule(helper + save + 'module.exports=savePromotion;', {}).outputText,context);
 const promotion={promotionId:'coupon',promotionCode:'SAVE10',promotionType:'COUPON'};
 await context.module.exports('vendor:package',promotion);
 assert.equal(writes[0][2],7);
 assert.equal(writes[0][1].appliedPromotions['vendor:package'].promotionCode,'SAVE10');
 assert.equal(promotions['vendor:package'].promotionCode,'SAVE10');
 await context.module.exports('vendor:package',null);
 assert.equal(writes[1][2],8);
 assert.equal(writes[1][1].appliedPromotions['vendor:package'],undefined);
});

test('a Review Order with an out-of-date coupon does not submit checkout', async () => {
 const f = load();
 const newerCart = {...f.cartData, appliedPromotions:{'vendor:package':{promotionCode:'SAVE10'}}};
 const get = f.context.draft.get;
 f.context.draft.get = key => key === 'cartData' ? JSON.stringify(newerCart) : get(key);
 await f.run();
 assert.equal(f.requests.length,0);
 assert.equal(f.alerts[0][0],'Cart updated');
});
