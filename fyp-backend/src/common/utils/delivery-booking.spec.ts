import { buildDeliveryCandidates, deliveryWindow, quoteDelivery, validateDeliveryConfiguration } from './delivery-booking';
const pkg:any = {deliveryFeeType:'PAID',deliveryFee:300,deliveryReserveMinutes:30,deliveryExtraWeightEnabled:true,deliveryIncludedWeightKg:1,deliveryExtraFeePerKg:100,deliveryWeightKg:1,deliveryWeightBasis:'PACKAGE',serviceWindowStartOffsetMinutes:-60,serviceWindowEndOffsetMinutes:0};
describe('Delivery fees and selected windows',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-11-01T00:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('charges one flat delivery fee regardless of weight, quantity, or guests',()=>{
  expect(quoteDelivery(pkg,1,1,false)).toMatchObject({baseFee:300,extraFee:0,weightKg:0,totalFee:300});
  expect(quoteDelivery({...pkg,deliveryWeightKg:50},5,100,true).totalFee).toBe(300);
 });
 it('free delivery is always zero',()=>{expect(quoteDelivery({...pkg,deliveryFeeType:'FREE'},5,100,true).totalFee).toBe(0)});
 it('rejects invalid fee and reserve time but ignores old weight settings',()=>{
  expect(()=>validateDeliveryConfiguration({...pkg,deliveryFee:-1})).toThrow();
  expect(()=>validateDeliveryConfiguration({...pkg,deliveryReserveMinutes:0})).toThrow();
  expect(()=>validateDeliveryConfiguration({...pkg,deliveryWeightKg:0})).not.toThrow();
  expect(()=>validateDeliveryConfiguration({})).not.toThrow();
 });
 it('reserves only the selected delivery, including the latest choice',()=>{const start=new Date('2026-11-09T09:00:00Z');expect(deliveryWindow(pkg,start,start)).toEqual({startDateTime:start,endDateTime:new Date('2026-11-09T09:30:00Z')});expect(()=>deliveryWindow(pkg,start,new Date('2026-11-09T07:59:00Z'))).toThrow()});
 it('includes quick times and Nepal offsets without duplicates',()=>{const event=new Date('2026-11-09T08:15:00Z');const result=buildDeliveryCandidates(pkg,event,undefined,'Asia/Kathmandu');expect(result.slots.map(s=>s.startDateTime.toISOString())).toEqual(expect.arrayContaining(['2026-11-09T07:15:00.000Z','2026-11-09T07:45:00.000Z','2026-11-09T08:15:00.000Z']));expect(new Set(result.slots.map(s=>+s.startDateTime)).size).toBe(result.slots.length);expect(buildDeliveryCandidates({...pkg,serviceWindowStartOffsetMinutes:0},event).slots).toHaveLength(1)});
 it('limits a days-based window to the chosen local date',()=>{const result=buildDeliveryCandidates({...pkg,serviceWindowStartOffsetMinutes:-2880},new Date('2026-11-09T09:00:00Z'),'2026-11-08','Asia/Karachi');expect(result.slots.length).toBe(48);expect(result.slots.every(s=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',day:'2-digit'}).format(s.startDateTime)==='08')).toBe(true)});
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PackageDto } from '../../vendor/dto/create-package.dto';
import { UpdatePackageDto } from '../../vendor/dto/update-package.dto';
import { VendorOrder, VendorOrderSchema } from '../../schemas/vendor-order.schema';
import { model } from 'mongoose';
describe('Delivery fields persist and validate on create and edit',()=>{
 it.each([PackageDto,UpdatePackageDto])('rejects invalid inherited delivery fields',async (Dto:any)=>{const value=plainToInstance(Dto,{packageName:'Cake',services:'Cake',deliveryFeeType:'OTHER',deliveryReserveMinutes:0,deliveryFee:-1});const errors=await validate(value as object);expect(errors.map(e=>e.property)).toEqual(expect.arrayContaining(['deliveryFeeType','deliveryReserveMinutes','deliveryFee']))});
 it('retains the agreed delivery settings, amount and timezone in the booking schema',()=>{const Order=model<VendorOrder>('DeliverySnapshotTest',VendorOrderSchema);const doc=new Order({bookingType:'DELIVERY_BASED',delivery:{...pkg,baseFee:300,extraFee:100,weightKg:1.5,totalFee:400,packageAmount:8000,timeZone:'Asia/Karachi'}});const saved=doc.toObject();expect(saved.delivery).toMatchObject({deliveryFeeType:'PAID',deliveryReserveMinutes:30,baseFee:300,extraFee:100,packageAmount:8000,timeZone:'Asia/Karachi',serviceWindowStartOffsetMinutes:-60});expect(saved.bookingType).toBe('DELIVERY_BASED')});
});

import { deliveryUnitKg, displayDeliveryWeight } from './delivery-booking';
describe('Legacy delivery weight fields',()=>{
 it('ignores old weight configuration for new quotes',()=>{
  expect(quoteDelivery({...pkg,deliveryWeightUnit:'lb',deliveryWeightKg:10,deliveryIncludedWeightKg:1,deliveryExtraFeePerKg:500},3,50,true))
   .toMatchObject({baseFee:300,extraFee:0,weightKg:0,totalFee:300});
 });
});
