import { currencySymbol, currencyOf } from '@/utils/currency';
import InfoHelp from './InfoHelp';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { deliveryFee, deliveryDateTime, displayDeliveryWeight, displayDeliveryRate, formatDeliveryReserve, DELIVERY_WEIGHT_UNITS } from '@/utils/deliveryBooking';
export default function DeliveryDetails({ pkg, quantity = 1, guests = 1, isCatering = false, timeZone = 'UTC', showConfiguration = false }: { pkg:any; quantity?:number; guests?:number; isCatering?:boolean; timeZone?:string; showConfiguration?:boolean }) {
  if (!pkg || typeof pkg !== 'object') return null;
  const d = pkg.delivery && typeof pkg.delivery === 'object' ? pkg.delivery : pkg;
  if (!d.deliveryFeeType || (pkg.bookingType && pkg.bookingType !== 'DELIVERY_BASED')) return null;
  const unit = d.deliveryWeightUnit || 'kg';
  const weight = (kg:number) => displayDeliveryWeight(kg,unit).toLocaleString();
  const rate = displayDeliveryRate(Number(d.deliveryExtraFeePerKg || 0),unit).toLocaleString();
  const fees = pkg.delivery && typeof pkg.delivery === 'object' ? pkg.delivery : deliveryFee(d,quantity,guests,isCatering);
  const booked = !!(pkg.delivery && typeof pkg.delivery === 'object') || !!pkg.deliveryStartDateTime;
  const selected = pkg.deliveryStartDateTime || pkg.requiredServiceWindow?.startDateTime || pkg.eventStartDateTime;
  if (showConfiguration) {
    const paid = d.deliveryFeeType === 'PAID';
    const rows = [
      ...(paid ? [['Base delivery fee',`${currencySymbol(currencyOf(pkg))} ${Number(fees.baseFee).toLocaleString()}`]] : []),
      ['Time reserved',`${formatDeliveryReserve(d.deliveryReserveMinutes)} per delivery`],
    ];
    return <View style={s.card}>
      <View style={s.header}><View style={s.titleGroup}><Text style={s.title}>Delivery details</Text><InfoHelp title="Delivery details" message="Review the fixed delivery fee and time reserved." /></View><Text style={[s.badge,!paid && s.free]}>{paid ? 'Paid delivery' : 'Free Delivery'}</Text></View>
      {rows.map(([label,value]) => <View key={label} style={s.row}><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>)}
    </View>;
  }
  return <View style={{marginVertical:8,gap:4}}>
    {!!(pkg.delivery && typeof pkg.delivery === 'object') && <Text style={{color:'#68225D'}}>Package amount: {currencySymbol(currencyOf(pkg))} {Number(d.packageAmount || 0).toLocaleString()}</Text>}
    {d.deliveryFeeType === 'FREE' ? <Text style={{color:'#246C44',backgroundColor:'#E4F6EB',alignSelf:'flex-start',borderRadius:8,paddingHorizontal:10,paddingVertical:5,fontWeight:'700'}}>Free Delivery</Text> : <>
      <Text style={{color:'#68225D'}}>Delivery: {currencySymbol(currencyOf(pkg))} {Number(fees.baseFee).toLocaleString()}</Text>
    </>}
    {!!selected && <Text style={{color:'#68225D'}}>Delivery date &amp; time: {deliveryDateTime(selected, d.timeZone || pkg.deliveryTimeZone || timeZone)}</Text>}
  </View>;
}
const s = StyleSheet.create({
  card:{backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:'#E8D4E2',padding:14,marginVertical:12},
  header:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:8},
  icon:{width:30,height:30,borderRadius:10,backgroundColor:'#F2E3EF',alignItems:'center',justifyContent:'center'},
  iconText:{fontSize:21,color:'#7B2869',fontWeight:'700'},titleGroup:{flexDirection:'row',alignItems:'center',gap:3,flexGrow:1,flexShrink:1,minWidth:0},title:{flexShrink:1,fontSize:14,fontWeight:'800',color:'#572047'},
  badge:{fontSize:11,fontWeight:'700',color:'#7B2869',backgroundColor:'#F4E7F1',paddingHorizontal:9,paddingVertical:5,borderRadius:8},free:{color:'#246C44',backgroundColor:'#E4F6EB'},
  row:{flexDirection:'row',alignItems:'flex-start',gap:12,paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#F4EAF1'},
  label:{flex:1,minWidth:0,fontSize:12,color:'#88717F',lineHeight:18},value:{flex:1.2,minWidth:0,fontSize:12,fontWeight:'700',color:'#542046',textAlign:'right',lineHeight:18,flexShrink:1},
});
