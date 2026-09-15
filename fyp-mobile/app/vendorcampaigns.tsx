import VendorCampaignsIndex from "@/components/VendorCampaigns/VendorCampaignsIndex";
import { Stack } from "expo-router";

export default function VendorCampaignsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <VendorCampaignsIndex />
    </>
  );
}