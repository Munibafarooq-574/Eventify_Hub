import InfoHelp from './InfoHelp';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { DeliverySettings, DELIVERY_WEIGHT_UNITS, deliveryUnitKg, displayDeliveryWeight, displayDeliveryRate, deliverySettingsError } from '@/utils/deliveryBooking';

export default function DeliveryPackageFields({ value, onChange }: { value: DeliverySettings; onChange: (v: DeliverySettings) => void }) {
  const [drafts, setDrafts] = useState<Record<string, { text:string; stored:unknown; unit:string }>>({});
  const [reserveUnit,setReserveUnit] = useState<'MINUTES' | 'HOURS'>('MINUTES');
  const unit = value.deliveryWeightUnit || 'kg';
  const set = (patch: Partial<DeliverySettings>) => onChange({ ...value, ...patch });
  const number = (label: string, field: keyof DeliverySettings, hint?: string) => {
    const weight = field === 'deliveryWeightKg' || field === 'deliveryIncludedWeightKg';
    const rate = field === 'deliveryExtraFeePerKg';
    const reserve = field === 'deliveryReserveMinutes';
    const editUnit = reserve ? reserveUnit : unit;
    const reserveFactor = reserve && reserveUnit === 'HOURS' ? 60 : 1;
    const saved = value[field];
    const displayed = saved == null ? '' : String(weight ? displayDeliveryWeight(Number(saved),unit) : rate ? displayDeliveryRate(Number(saved),unit) : reserve ? Number(Number(saved) / reserveFactor).toString() : saved);
    const draft = drafts[field];
    const text = draft?.unit === editUnit && Object.is(draft.stored,saved) ? draft.text : displayed;
    return <View style={s.field}>
      <View style={s.heading}><Text style={[s.label,{flexShrink:1}]}>{label}</Text>{hint && <InfoHelp title={label} message={hint} />}</View>
      <TextInput accessibilityLabel={label} style={s.input} keyboardType="decimal-pad" value={text} onChangeText={text => {
        const numeric = text === '' ? undefined : Number(text) * (weight ? deliveryUnitKg(unit) : rate ? 1 / deliveryUnitKg(unit) : reserveFactor);
        const stored = reserve && numeric != null ? Number(numeric.toFixed(8)) : numeric;
        setDrafts(current => ({...current,[field]:{text,stored,unit:editUnit}}));
        set({[field]:stored});
      }} />
      {reserve && <View style={s.row}>{(['MINUTES','HOURS'] as const).map(option => <TouchableOpacity key={option} accessibilityRole="radio" accessibilityState={{checked:reserveUnit === option}} style={[s.option,reserveUnit === option && s.active]} onPress={() => setReserveUnit(option)}><Text style={s.label}>{option === 'HOURS' ? 'Hours' : 'Minutes'}</Text></TouchableOpacity>)}</View>}
    </View>;
  };
  return <View style={s.card}>
    <View style={[s.heading,{marginBottom:8}]}><Text style={s.title}>Delivery charges</Text><InfoHelp title="Delivery charges" message="Choose Free Delivery for no extra delivery fee. Customers will see a Free Delivery badge. Otherwise, enter a delivery fee. It is charged once for this booking." /></View>
    <View style={s.row}>{(['FREE','PAID'] as const).map(type => <TouchableOpacity key={type} accessibilityRole="radio" accessibilityState={{ checked:value.deliveryFeeType === type }} style={[s.option,value.deliveryFeeType === type && s.active]} onPress={() => set({ deliveryFeeType:type, ...(type === 'FREE' ? { deliveryFee:0, deliveryExtraWeightEnabled:false } : {}) })}><Text style={s.label}>{type === 'FREE' ? 'Free Delivery' : 'Delivery Charges'}</Text></TouchableOpacity>)}</View>
    {value.deliveryFeeType === 'PAID' && <>
      {number('Base delivery fee (Rs.)','deliveryFee','Charged once for this booking.')}
    </>}
    </>}
    {number('Time reserved for each delivery','deliveryReserveMinutes','Choose how long you need for a delivery. This time must fit within your working hours. Customers only choose the delivery time. Choose Minutes or Hours; for example, 1 hour reserves the same time as 60 minutes.')}
    {!!deliverySettingsError(value) && <Text style={s.error}>{deliverySettingsError(value)}</Text>}
  </View>;
}
const s = StyleSheet.create({ heading:{flexDirection:'row',alignItems:'center',gap:3}, card:{backgroundColor:'#FFF8FC',borderWidth:1,borderColor:'#EBD7E5',borderRadius:16,padding:16,marginVertical:14},title:{fontSize:17,fontWeight:'700',color:'#7B2869'},row:{flexDirection:'row',alignItems:'center',gap:8,marginVertical:8,flexWrap:'wrap'},option:{padding:12,borderWidth:1,borderColor:'#EBD7E5',borderRadius:12},active:{backgroundColor:'#F0DCEC',borderColor:'#7B2869'},field:{marginVertical:8},label:{fontSize:14,fontWeight:'600',color:'#45203D'},input:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#EBD7E5',borderRadius:10,padding:12,marginTop:6,color:'#222'},error:{color:'#B42318',marginTop:8} });
