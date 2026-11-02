import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { DeliverySettings, deliverySettingsError } from '@/utils/deliveryBooking';

export default function DeliveryPackageFields({ value, onChange }: { value: DeliverySettings; onChange: (v: DeliverySettings) => void }) {
  const set = (patch: Partial<DeliverySettings>) => onChange({ ...value, ...patch });
  const number = (label: string, field: keyof DeliverySettings, hint?: string) => <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={s.input} keyboardType="decimal-pad" value={value[field] == null ? '' : String(value[field])} onChangeText={text => set({ [field]: text as any })} />{hint && <Text style={s.hint}>{hint}</Text>}</View>;
  return <View style={s.card}>
    <Text style={s.title}>Delivery charges</Text>
    <View style={s.row}>{(['FREE','PAID'] as const).map(type => <TouchableOpacity key={type} accessibilityRole="radio" accessibilityState={{ checked:value.deliveryFeeType === type }} style={[s.option,value.deliveryFeeType === type && s.active]} onPress={() => set({ deliveryFeeType:type, ...(type === 'FREE' ? { deliveryFee:0, deliveryExtraWeightEnabled:false } : {}) })}><Text style={s.label}>{type === 'FREE' ? 'Free Delivery' : 'Delivery Charges'}</Text></TouchableOpacity>)}</View>
    {value.deliveryFeeType === 'FREE' ? <Text style={s.hint}>Customers will see a Free Delivery badge. No extra delivery fee will be charged.</Text> : <>
      {number('Base delivery fee (Rs.)','deliveryFee','Charged once for this booking, not once per guest.')}
      <View style={s.row}><Text style={[s.label,{flex:1}]}>Extra charges for additional weight</Text><Switch value={!!value.deliveryExtraWeightEnabled} onValueChange={v => set({deliveryExtraWeightEnabled:v})} trackColor={{true:'#7B2869'}} /></View>
      {value.deliveryExtraWeightEnabled && <>
        {number('Weight covered by delivery fee (kg)','deliveryIncludedWeightKg')}
        {number('Extra fee per additional kg (Rs.)','deliveryExtraFeePerKg','Each started additional kg is charged. For example, 1.5 kg counts as 1 extra kg above a 1 kg allowance.')}
        <Text style={s.label}>Delivery weight is measured</Text>
        <View style={s.row}>{(['PACKAGE','PER_GUEST'] as const).map(basis => <TouchableOpacity key={basis} style={[s.option,value.deliveryWeightBasis === basis && s.active]} onPress={() => set({deliveryWeightBasis:basis})}><Text style={s.label}>{basis === 'PACKAGE' ? 'Per package' : 'Per guest (Catering)'}</Text></TouchableOpacity>)}</View>
        {number(value.deliveryWeightBasis === 'PER_GUEST' ? 'Delivery weight per guest (kg)' : 'Delivery weight per package (kg)','deliveryWeightKg')}
      </>}
    </>}
    {number('Time reserved for each delivery (minutes)','deliveryReserveMinutes','Choose how long you need for a delivery. This time must fit within your working hours. Customers only choose the delivery time.')}
    {!!deliverySettingsError(value) && <Text style={s.error}>{deliverySettingsError(value)}</Text>}
  </View>;
}
const s = StyleSheet.create({ card:{backgroundColor:'#FFF8FC',borderWidth:1,borderColor:'#EBD7E5',borderRadius:16,padding:16,marginVertical:14},title:{fontSize:17,fontWeight:'700',color:'#7B2869',marginBottom:12},row:{flexDirection:'row',alignItems:'center',gap:8,marginVertical:8,flexWrap:'wrap'},option:{padding:12,borderWidth:1,borderColor:'#EBD7E5',borderRadius:12},active:{backgroundColor:'#F0DCEC',borderColor:'#7B2869'},field:{marginVertical:8},label:{fontSize:14,fontWeight:'600',color:'#45203D'},input:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#EBD7E5',borderRadius:10,padding:12,marginTop:6,color:'#222'},hint:{fontSize:13,color:'#766572',lineHeight:19,marginTop:5},error:{color:'#B42318',marginTop:8} });
