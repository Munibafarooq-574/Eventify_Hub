import { ConflictException } from '@nestjs/common';
import { ClientSession, Connection, Model } from 'mongoose';
const minutes=(value:unknown,fallback:number)=>value!=null&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):fallback;
export function paymentWindowSettings(settings:any,start:Date,timeZone='UTC') {
 const day=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone}).format(start).toUpperCase();
 const daily=settings?.daySlots?.find((d:any)=>d.day===day);
 const options=daily?.advanceNoticeOptionsMinutes?.length?daily.advanceNoticeOptionsMinutes:settings?.advanceNoticeOptionsMinutes;
 const valid=Array.isArray(options)?options.map(Number).filter(n=>Number.isFinite(n)&&n>=0):[];
 return { preparationMinutes: Math.max(minutes(process.env.BOOKING_PAYMENT_PREPARATION_MINUTES,60),valid.length?Math.min(...valid):minutes(settings?.minimumAdvanceMinutes,0)),minimumWindowMinutes:minutes(process.env.BOOKING_MIN_PAYMENT_WINDOW_MINUTES,15) };
}
export function effectiveDownPaymentDeadline(booking:any):Date|null {
 const values=[booking.paymentDeadline,booking.holdExpiresAt,booking.paymentServiceCutoff].filter(Boolean).map(v=>new Date(v).getTime()).filter(Number.isFinite);
 const cutoff=servicePaymentCutoff(booking);if(cutoff)values.push(cutoff.getTime());
 return values.length?new Date(Math.min(...values)):null;
}
export function snapshotDownPaymentWindow(booking:any,settings:any,now:Date,timeZone='UTC') {
 const start=new Date(booking.eventStartDateTime);
 if(!Number.isFinite(start.getTime())||start.getTime()<=now.getTime())throw new ConflictException('This service has already started or its timing is unavailable. This booking cannot be accepted.');
 const config=paymentWindowSettings(settings,start,timeZone);
 const cutoff=new Date(start.getTime()-config.preparationMinutes*60000);
 const holdHours=minutes(process.env.BOOKING_HOLD_HOURS,24)||24;
 const deadline=new Date(Math.min(now.getTime()+holdHours*3600000,cutoff.getTime()));
 if(deadline.getTime()<=now.getTime()||deadline.getTime()-now.getTime()<config.minimumWindowMinutes*60000)throw new ConflictException('Not enough time remains for payment and service preparation. Please ask the client to choose a later service time.');
 booking.paymentPreparationMinutes=config.preparationMinutes;booking.paymentMinimumWindowMinutes=config.minimumWindowMinutes;booking.paymentServiceCutoff=cutoff;
 booking.acceptedAt=now;booking.holdExpiresAt=deadline;booking.paymentDeadline=deadline;
 return deadline;
}
// Every down-payment submit/resolve/expiry writes the same booking inside a transaction.
// MongoDB retries conflicting writes; the winner is re-read before another operation proceeds.
export async function withBookingPaymentLock<T>(connection:Connection,model:Model<any>,id:any,work:(session:ClientSession)=>Promise<T>):Promise<T> {
 const session=await connection.startSession();let result:T;
 try {await session.withTransaction(async()=>{await model.updateOne({_id:id},{$inc:{__v:1}},{session});result=await work(session)});return result!;}finally{await session.endSession()}
}

export function applyLegacyPaymentWindow(booking:any,settings:any,timeZone='UTC') {
 if(booking.paymentPreparationMinutes != null || !booking.eventStartDateTime)return;
 const start=new Date(booking.eventStartDateTime);if(!Number.isFinite(start.getTime()))return;
 booking.paymentPreparationMinutes=paymentWindowSettings(settings,start,timeZone).preparationMinutes;
 booking.paymentServiceCutoff=new Date(start.getTime()-booking.paymentPreparationMinutes*60000);
}
export function paymentVerificationOverdue(booking:any,pending:any):boolean {
 if(!pending || pending.type!=='DOWN_PAYMENT')return false;
 const cutoff=servicePaymentCutoff(booking);
 return !!cutoff&&Date.now()>=cutoff.getTime();
}
export function servicePaymentCutoff(booking:any):Date|null {
 const cutoffs:number[]=[];
 if(booking.paymentServiceCutoff)cutoffs.push(new Date(booking.paymentServiceCutoff).getTime());
 if(booking.eventStartDateTime)cutoffs.push(new Date(booking.eventStartDateTime).getTime()-minutes(booking.paymentPreparationMinutes,minutes(process.env.BOOKING_PAYMENT_PREPARATION_MINUTES,60))*60000);
 const valid=cutoffs.filter(Number.isFinite);return valid.length?new Date(Math.min(...valid)):null;
}

export function getVendorDownPaymentConfig(vendorUser: any): { type: string; value: number } | null {
        const businessDetails =
            vendorUser?.photographerBusinessDetails ||
            vendorUser?.cateringBusinessDetails ||
            vendorUser?.venueBusinessDetails ||
            vendorUser?.salonBusinessDetails ||
            vendorUser?.cakeBusinessDetails ||
            vendorUser?.mehndiBusinessDetails ||
            vendorUser?.soundBusinessDetails;

        if (!businessDetails || businessDetails.downPayment == null) {
            return null;
        }

        return {
            type: businessDetails.downPaymentType || 'PERCENTAGE',
            value: businessDetails.downPayment,
        };
}
