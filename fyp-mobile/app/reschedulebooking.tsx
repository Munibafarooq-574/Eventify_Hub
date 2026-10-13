import React from 'react';
import { Stack } from 'expo-router';
import ClientRescheduleScreen from '@/components/rescheduling/ClientRescheduleScreen';

export default function RescheduleBookingRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ClientRescheduleScreen />
    </>
  );
}