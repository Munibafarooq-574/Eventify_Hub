import CreateVendorCampaignIndex from "@/components/VendorCampaigns/CreateVendorCampaignIndex";
import { Stack } from "expo-router";

export default function CreateVendorCampaignScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <CreateVendorCampaignIndex />
    </>
  );
}