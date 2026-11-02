import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { growthApi } from '@/services/growthApiClient';
import { deliveryDateTime } from '@/utils/deliveryBooking';

export type DeliveryChoice = { startDateTime:string; endDateTime:string; available:boolean; timeZone:string };
type Props = { vendorId?:string; packageId?:string; eventCityId?:string; eventDate:string; eventStartTime:string; eventDurationMinutes:number; orderId?:string; vendorOrderId?:string; onChange:(slot:DeliveryChoice | null) => void };
export default function DeliveryTimePicker(props: Props) {
  const { vendorId,packageId,eventCityId,eventDate,eventStartTime,eventDurationMinutes,orderId,vendorOrderId,onChange } = props;
  const [data,setData] = useState<any>(null);
  const [date,setDate] = useState('');
  const [chosen,setChosen] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [showDate,setShowDate] = useState(false);
  const [retry,setRetry] = useState(0);
  const [context,setContext] = useState('');
  const contextKey = [vendorId,packageId,eventCityId,eventDate,eventStartTime,eventDurationMinutes,orderId,vendorOrderId].join('|');
  useEffect(() => { setDate(''); setContext(contextKey); },[contextKey]);
  useEffect(() => {
    let active = true;
    onChange(null); setChosen(''); setLoading(true); setError('');
    if (context !== contextKey) return;
    const endpoint = orderId ? `/orders/${orderId}/delivery-candidates` : '/vendor-availability/delivery-candidates';
    growthApi.post<any>(endpoint,{ vendorId,packageId,eventCityId,eventDate,eventStartTime,eventDurationMinutes,deliveryDate:date || undefined,vendorOrderId }).then(result => { if (active) setData(result); }).catch(e => { if(active) {setData(null);setError(e.message || 'Delivery times could not be checked.');} }).finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  },[context,contextKey,date,retry]);
  const checking = loading || context !== contextKey;
  const select = (slot:any) => { if (!slot.available || checking) return;setChosen(slot.startDateTime);onChange({...slot,timeZone:data.timeZone}); };
  const label = (slot:any) => {
    const minutes = Math.round((new Date(slot.startDateTime).getTime() - new Date(data.eventStartDateTime).getTime()) / 60000);
    return minutes === -60 ? '1 hour before event' : minutes === -30 ? '30 minutes before event' : minutes === 0 ? 'At event start' : '';
  };
  const dayKey = (value:string) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:data.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p => [p.type,p.value]));return `${p.year}-${p.month}-${p.day}`; };
  return <View style={{backgroundColor:'#FFF8FC',borderColor:'#EBD7E5',borderWidth:1,borderRadius:14,padding:14,marginVertical:12}}>
    <Text style={{color:'#7B2869',fontWeight:'700',fontSize:16}}>Choose delivery date &amp; time</Text>
    {checking ? <ActivityIndicator color="#7B2869" style={{margin:16}} /> : error ? <><Text style={{color:'#B42318',marginVertical:8}}>{error}</Text><TouchableOpacity onPress={() => setRetry(r => r+1)}><Text style={{color:'#7B2869'}}>Try again</Text></TouchableOpacity></> : data && <>
      <Text style={{color:'#766572',marginVertical:8}}>Allowed: {deliveryDateTime(data.earliest,data.timeZone)} to {deliveryDateTime(data.latest,data.timeZone)} ({data.timeZone}).</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => setShowDate(v => !v)} style={{padding:12,backgroundColor:'#F0DCEC',borderRadius:10}}><Text style={{color:'#7B2869',fontWeight:'600'}}>Choose another available date · {data.date}</Text></TouchableOpacity>
      {showDate && <View><DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} value={new Date(`${data.date}T12:00:00`)} minimumDate={new Date(`${dayKey(data.earliest)}T00:00:00`)} maximumDate={new Date(`${dayKey(data.latest)}T23:59:59`)} onChange={(_,value) => { if(Platform.OS !== 'ios')setShowDate(false);if(value)setDate(`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`); }} />{Platform.OS === 'ios' && <TouchableOpacity onPress={() => setShowDate(false)}><Text style={{color:'#7B2869',padding:10}}>Done</Text></TouchableOpacity>}</View>}
      {!data.slots?.some((s:any) => s.available) && <Text style={{color:'#B42318',marginTop:12}}>No delivery times are available on this date. Choose another allowed date or a later event time.</Text>}
      {(data.slots || []).map((slot:any) => <TouchableOpacity key={slot.startDateTime} disabled={!slot.available} accessibilityState={{disabled:!slot.available,selected:chosen === slot.startDateTime}} onPress={() => select(slot)} style={{padding:12,marginTop:8,borderRadius:10,borderWidth:1,borderColor:chosen === slot.startDateTime ? '#7B2869':'#EBD7E5',backgroundColor:chosen === slot.startDateTime ? '#F0DCEC':'white',opacity:slot.available?1:0.5}}>
        {!!label(slot) && <Text style={{color:'#7B2869',fontWeight:'700'}}>{label(slot)}</Text>}
        <Text style={{color:'#45203D'}}>{deliveryDateTime(slot.startDateTime,data.timeZone)}</Text>
        {!slot.available && <Text style={{color:'#766572'}}>{slot.reason || 'Unavailable'}</Text>}
      </TouchableOpacity>)}
      {!!chosen && <Text style={{color:'#7B2869',fontWeight:'700',marginTop:12}}>Delivery: {deliveryDateTime(chosen,data.timeZone)}</Text>}
    </>}
  </View>;
}
