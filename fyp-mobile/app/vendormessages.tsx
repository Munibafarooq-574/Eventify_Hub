import VendorMessagesIndex, { MessagesAccessLoading } from '@/components/vendormessages/VendorMessagesIndex';
import { ACCESS_FRESH_MS, getSubscriptionAccessState, hasActiveVendorSubscription, readVerifiedSubscription, rememberVerifiedSubscription } from '@/services/getSubscriptionAccessState';
import { getSecureData, getUserData } from '@/store';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
export default function VendorMessagesScreen() {
  const [state, setState] = useState<'loading' | 'allowed' | 'restricted' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let mounted = true;
    setState(previous => previous === 'allowed' ? previous : 'loading');

    const checkAccess = async () => {
      try {
        const user = await getUserData();
        if (!mounted) return;
        if (!user?._id) throw new Error('Sign in required');
        if (String(user.role).toLowerCase() !== 'vendor') {
          setState('allowed');
          return;
        }

        const vendorId = String(user._id);
        const token = await getSecureData('token');
        if (!mounted) return;
        if (!token) throw new Error('Sign in required');

        const cached = readVerifiedSubscription(vendorId, token);
        if (cached && Date.now() - cached.verifiedAt < ACCESS_FRESH_MS && hasActiveVendorSubscription(cached.access)) {
          setState('allowed');
          return;
        }

        setState('loading');
        const access = await getSubscriptionAccessState(vendorId);
        if (!mounted) return;
        rememberVerifiedSubscription(vendorId, token, access);
        setState(hasActiveVendorSubscription(access) ? 'allowed' : 'restricted');
      } catch {
        if (mounted) setState('error');
      }
    };

    void checkAccess();
    return () => { mounted = false; };
  }, [retry]));

  if (state === 'loading') return <MessagesAccessLoading />;
  if (state === 'allowed') return <VendorMessagesIndex />;
  return <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#fff'}}>
      <Text style={{fontSize:22,fontWeight:'700',textAlign:'center',color:'#780C60',marginBottom:16}}>{state==='error'?'Unable to verify messaging access':'Booking messages'}</Text>
      <Text style={{fontSize:16,textAlign:'center',lineHeight:24,marginBottom:24}}>{state==='error'?'Please try again. Your existing bookings remain available.':'Your subscription is inactive. Open an existing booking and tap Message to contact its client.'}</Text>
      {state==='error'&&<TouchableOpacity accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={{padding:16}}><Text style={{textAlign:'center',color:'#780C60'}}>Try again</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" onPress={()=>router.replace('/vendorordersummary')} style={{padding:16,borderRadius:12,backgroundColor:'#780C60'}}><Text style={{textAlign:'center',fontWeight:'600',color:'#fff'}}>View My Orders</Text></TouchableOpacity>
  </View>;
}
