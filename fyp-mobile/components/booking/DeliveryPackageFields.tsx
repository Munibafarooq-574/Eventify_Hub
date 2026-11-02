import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { DeliverySettings, DELIVERY_WEIGHT_UNITS, deliveryUnitKg, displayDeliveryWeight, displayDeliveryRate, deliverySettingsError } from '@/utils/deliveryBooking';

export default function DeliveryPackageFields({ value, onChange }: { value: DeliverySettings; onChange: (v: DeliverySettings) => void }) {
  const [drafts, setDrafts] = useState<Record<string, { text:string; stored:unknown; unit:string }>>({});
  const unit = value.deliveryWeightUnit || 'kg';
  const set = (patch: Partial<DeliverySettings>) => onChange({ ...value, ...patch });
  const number = (label: string, field: keyof DeliverySettings, hint?: string) => {
    const weight = field === 'deliveryWeightKg' || field === 'deliveryIncludedWeightKg';
    const rate = field === 'deliveryExtraFeePerKg';
    const saved = value[field];
    const displayed = saved == null ? '' : String(weight ? displayDeliveryWeight(Number(saved),unit) : rate ? displayDeliveryRate(Number(saved),unit) : saved);
    const draft = drafts[field];
    const text = draft?.unit === unit && Object.is(draft.stored,saved) ? draft.text : displayed;
    return <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={s.input} keyboardType="decimal-pad" value={text} onChangeText={text => {
        const stored = text === '' ? undefined : Number(text) * (weight ? deliveryUnitKg(unit) : rate ? 1 / deliveryUnitKg(unit) : 1);
        setDrafts(current => ({...current,[field]:{text,stored,unit}}));
        set({[field]:stored});
      }} />
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>;
  };
  return <View style={s.card}>
    <Text style={s.title}>Delivery charges</Text>
    <View style={s.row}>{(['FREE','PAID'] as const).map(type => <TouchableOpacity key={type} accessibilityRole="radio" accessibilityState={{ checked:value.deliveryFeeType === type }} style={[s.option,value.deliveryFeeType === type && s.active]} onPress={() => set({ deliveryFeeType:type, ...(type === 'FREE' ? { deliveryFee:0, deliveryExtraWeightEnabled:false } : {}) })}><Text style={s.label}>{type === 'FREE' ? 'Free Delivery' : 'Delivery Charges'}</Text></TouchableOpacity>)}</View>
    {value.deliveryFeeType === 'FREE' ? <Text style={s.hint}>Customers will see a Free Delivery badge. No extra delivery fee will be charged.</Text> : <>
      {number('Base delivery fee (Rs.)','deliveryFee','Charged once for this booking, not once per guest.')}
      <View style={s.row}><Text style={[s.label,{flex:1}]}>Extra charges for additional weight</Text><Switch value={!!value.deliveryExtraWeightEnabled} onValueChange={v => set({deliveryExtraWeightEnabled:v})} trackColor={{true:'#7B2869'}} /></View>
      {value.deliveryExtraWeightEnabled && <>
        <Text style={s.label}>Weight unit</Text>
        <View style={s.row}>{DELIVERY_WEIGHT_UNITS.map(option => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{checked:unit === option.value}} style={[s.option,unit === option.value && s.active]} onPress={() => set({deliveryWeightUnit:option.value})}><Text style={s.label}>{option.label}</Text></TouchableOpacity>)}</View>
        <Text style={s.hint}>Changing units converts the weights and rate. Review the values before saving.</Text>
        {number(`Weight covered by delivery fee (${unit})`,'deliveryIncludedWeightKg')}
        {number(`Extra fee per additional ${unit} (Rs.)`,'deliveryExtraFeePerKg',`Each started additional ${unit} is charged. For example, 1.5 ${unit} counts as 1 extra ${unit} above a 1 ${unit} allowance.`)}
        <Text style={s.label}>Delivery weight is measured</Text>
        <View style={s.row}>{(['PACKAGE','PER_GUEST'] as const).map(basis => <TouchableOpacity key={basis} style={[s.option,value.deliveryWeightBasis === basis && s.active]} onPress={() => set({deliveryWeightBasis:basis})}><Text style={s.label}>{basis === 'PACKAGE' ? 'Per package' : 'Per guest (Catering)'}</Text></TouchableOpacity>)}</View>
        {number(value.deliveryWeightBasis === 'PER_GUEST' ? `Delivery weight per guest (${unit})` : `Delivery weight per package (${unit})`,'deliveryWeightKg')}
      </>}
    </>}
    {number('Time reserved for each delivery (minutes)','deliveryReserveMinutes','Choose how long you need for a delivery. This time must fit within your working hours. Customers only choose the delivery time.')}
    {!!deliverySettingsError(value) && <Text style={s.error}>{deliverySettingsError(value)}</Text>}
  </View>;
}
const s = StyleSheet.create({ card:{backgroundColor:'#FFF8FC',borderWidth:1,borderColor:'#EBD7E5',borderRadius:16,padding:16,marginVertical:14},title:{fontSize:17,fontWeight:'700',color:'#7B2869',marginBottom:12},row:{flexDirection:'row',alignItems:'center',gap:8,marginVertical:8,flexWrap:'wrap'},option:{padding:12,borderWidth:1,borderColor:'#EBD7E5',borderRadius:12},active:{backgroundColor:'#F0DCEC',borderColor:'#7B2869'},field:{marginVertical:8},label:{fontSize:14,fontWeight:'600',color:'#45203D'},input:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#EBD7E5',borderRadius:10,padding:12,marginTop:6,color:'#222'},hint:{fontSize:13,color:'#766572',lineHeight:19,marginTop:5},error:{color:'#B42318',marginTop:8} });
