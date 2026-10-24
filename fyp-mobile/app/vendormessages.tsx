import VendorMessagesIndex from '@/components/vendormessages/VendorMessagesIndex';
import { getSubscriptionAccessState } from '@/services/getSubscriptionAccessState';
import { getUserData } from '@/store';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
export default function VendorMessagesScreen() {
  const [state,setState]=useState<'loading'|'allowed'|'restricted'|'error'>('loading');
  const [retry,setRetry]=useState(0);
  useFocusEffect(useCallback(()=>{
    let mounted=true;setState('loading');
    void (async()=>{try{
      const user=await getUserData();if(!user?._id)throw new Error('Sign in required');
      const access=await getSubscriptionAccessState(String(user._id));
      const end=access.subscription?.endDate;
      const allowed=access.accessAllowed && !access.subscriptionRequired && Boolean(end) && new Date(end!).getTime()>Date.now();
      if(mounted)setState(allowed?'allowed':'restricted');
    }catch{if(mounted)setState('error')}})();return()=>{mounted=false};
  },[retry]));
  if(state==='allowed')return <VendorMessagesIndex/>;
  return <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#fff'}}>
    {state==='loading'?<ActivityIndicator color="#780C60"/>:<>
      <Text style={{fontSize:22,fontWeight:'700',textAlign:'center',color:'#780C60',marginBottom:16}}>{state==='error'?'Unable to verify messaging access':'Booking messages'}</Text>
      <Text style={{fontSize:16,textAlign:'center',lineHeight:24,marginBottom:24}}>{state==='error'?'Please try again. Your existing bookings remain available.':'Your subscription is inactive. Open an existing booking and tap Message to contact its client.'}</Text>
      {state==='error'&&<TouchableOpacity accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={{padding:16}}><Text style={{textAlign:'center',color:'#780C60'}}>Try again</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" onPress={()=>router.replace('/vendorordersummary')} style={{padding:16,borderRadius:12,backgroundColor:'#780C60'}}><Text style={{textAlign:'center',fontWeight:'600',color:'#fff'}}>View My Orders</Text></TouchableOpacity>
    </>}
  </View>;
}
