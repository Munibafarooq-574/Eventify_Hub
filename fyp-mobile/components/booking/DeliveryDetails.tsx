import React from 'react';
import { View, Text } from 'react-native';
import { deliveryFee, deliveryDateTime } from '@/utils/deliveryBooking';
export default function DeliveryDetails({ pkg, quantity = 1, guests = 1, isCatering = false, timeZone = 'UTC' }: { pkg:any; quantity?:number; guests?:number; isCatering?:boolean; timeZone?:string }) {
  const d = pkg.delivery || pkg;
  if (!d.deliveryFeeType || (pkg.bookingType && pkg.bookingType !== 'DELIVERY_BASED')) return null;
  const fees = pkg.delivery || deliveryFee(d,quantity,guests,isCatering);
  const booked = !!pkg.delivery || !!pkg.deliveryStartDateTime;
  const selected = pkg.deliveryStartDateTime || pkg.requiredServiceWindow?.startDateTime || pkg.eventStartDateTime;
  return <View style={{marginVertical:8,gap:4}}>
    {pkg.delivery && <Text style={{color:"#68225D"}}>Package amount: Rs. {Number(d.packageAmount).toLocaleString()}</Text>}
    {d.deliveryFeeType === 'FREE' ? <Text style={{color:'#246C44',backgroundColor:'#E4F6EB',alignSelf:'flex-start',borderRadius:8,paddingHorizontal:10,paddingVertical:5,fontWeight:'700'}}>Free Delivery</Text> : <>
      <Text style={{color:'#68225D'}}>Delivery: Rs. {Number(fees.baseFee).toLocaleString()}</Text>
      {!!d.deliveryExtraWeightEnabled && booked && <Text style={{color:'#68225D'}}>Extra weight fee: Rs. {Number(fees.extraFee).toLocaleString()} · {Number(fees.weightKg).toLocaleString()} kg</Text>}
      {d.deliveryExtraWeightEnabled && <Text style={{color:'#766572'}}>Covers {d.deliveryIncludedWeightKg} kg; Rs. {d.deliveryExtraFeePerKg} for each started additional kg.</Text>}
    </>}
    {!!selected && <Text style={{color:'#68225D'}}>Delivery date &amp; time: {deliveryDateTime(selected, d.timeZone || pkg.deliveryTimeZone || timeZone)}</Text>}
  </View>;
}
