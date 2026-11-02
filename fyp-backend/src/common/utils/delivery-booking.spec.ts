import { buildDeliveryCandidates, deliveryWindow, quoteDelivery, validateDeliveryConfiguration } from './delivery-booking';
const pkg:any = {deliveryFeeType:'PAID',deliveryFee:300,deliveryReserveMinutes:30,deliveryExtraWeightEnabled:true,deliveryIncludedWeightKg:1,deliveryExtraFeePerKg:100,deliveryWeightKg:1,deliveryWeightBasis:'PACKAGE',serviceWindowStartOffsetMinutes:-60,serviceWindowEndOffsetMinutes:0};
describe('Delivery fees and selected windows',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-11-01T00:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it.each([[1,300],[1.5,400],[2,400],[3,500],[1.00000000001,300]])('charges %s kg once for Rs. %s', (weight,total)=>{expect(quoteDelivery({...pkg,deliveryWeightKg:weight},1,50,false).totalFee).toBe(total)});
 it('free delivery ignores stale paid/weight fields',()=>{expect(quoteDelivery({...pkg,deliveryFeeType:'FREE'},5,100,true)).toMatchObject({baseFee:0,extraFee:0,totalFee:0})});
 it('multiplies weight by quantity but charges base delivery once',()=>{expect(quoteDelivery(pkg,3,50,false)).toMatchObject({weightKg:3,baseFee:300,extraFee:200,totalFee:500})});
 it('catering weight follows guests without multiplying delivery fee',()=>{expect(quoteDelivery({...pkg,deliveryWeightBasis:'PER_GUEST',deliveryWeightKg:0.25},1,10,true)).toMatchObject({weightKg:2.5,totalFee:500});expect(()=>quoteDelivery(pkg,1,10,true)).toThrow('per guest')});
 it('rejects invalid configuration; preserves legacy packages',()=>{expect(()=>validateDeliveryConfiguration({...pkg,deliveryFee:-1})).toThrow();expect(()=>validateDeliveryConfiguration({...pkg,deliveryReserveMinutes:0})).toThrow();expect(()=>validateDeliveryConfiguration({...pkg,deliveryWeightKg:0})).toThrow();expect(()=>validateDeliveryConfiguration({})).not.toThrow()});
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
describe('Selected delivery weight unit',()=>{
 it.each(['kg','g','lb','oz'])('charges started additional %s units while storing kg weights',unit=>{
  const factor=deliveryUnitKg(unit);
  const selected:any={...pkg,deliveryWeightUnit:unit,deliveryIncludedWeightKg:2*factor,deliveryWeightKg:3*factor,deliveryExtraFeePerKg:100/factor};
  expect(quoteDelivery(selected)).toMatchObject({baseFee:300,extraFee:100,totalFee:400});
  expect(quoteDelivery({...selected,deliveryWeightKg:3.5*factor}).extraFee).toBe(200);
  expect(quoteDelivery({...selected,deliveryWeightKg:2*factor+factor*1e-10}).extraFee).toBe(0);
  expect(quoteDelivery({...selected,deliveryFeeType:'FREE'}).totalFee).toBe(0);
  expect(displayDeliveryWeight(3*factor,unit)).toBe(3);
 });
 it('preserves legacy kg pricing and rejects unknown units',()=>{
  expect(quoteDelivery(pkg).totalFee).toBe(300);
  expect(()=>quoteDelivery({...pkg,deliveryWeightUnit:'stone'} as any)).toThrow('kg, g, lb or oz');
 });
 it('uses per-guest weight for Catering without multiplying the base delivery fee',()=>{
  const factor=deliveryUnitKg('lb');
  const result=quoteDelivery({...pkg,deliveryWeightUnit:'lb',deliveryWeightBasis:'PER_GUEST',deliveryWeightKg:0.5*factor,deliveryIncludedWeightKg:2*factor,deliveryExtraFeePerKg:100/factor},1,6,true);
  expect(result).toMatchObject({baseFee:300,extraFee:100,totalFee:400});
 });
 it('keeps selected unit with the booking snapshot',()=>{
  const Order=model<VendorOrder>('DeliveryUnitSnapshotTest',VendorOrderSchema);
  expect(new Order({delivery:{deliveryWeightUnit:'lb'}}).toObject().delivery?.deliveryWeightUnit).toBe('lb');
 });
});
