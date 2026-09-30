import { Stack } from 'expo-router';

import VendorProfileDetailsIndex from '@/components/vendorprofiledetails(orginzer)/VendorProfileDetailsIndex';

export default function VendorPackageBookingScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <VendorProfileDetailsIndex />
    </>
  );
}