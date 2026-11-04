//import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { CART_REMINDER } from '@/services/cartReminder';
import { getSecureData, getUserData } from '@/store';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { useColorScheme } from '@/hooks/useColorScheme';

Notifications.setNotificationHandler({
  handleNotification: async ({ request }) => {
    const isReminder = request.content.data?.type === CART_REMINDER;
    return { shouldShowBanner: isReminder, shouldShowList: isReminder, shouldPlaySound: isReminder, shouldSetBadge: false };
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const navigation = useNavigationContainerRef();
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const openCart = async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data?.type !== CART_REMINDER) return;
      await Notifications.clearLastNotificationResponseAsync();
      const [user, event, cart] = await Promise.all([
        getUserData(), getSecureData('eventDetails'), getSecureData('cartData'),
      ]);
      if (user?._id === data.userId && JSON.parse(event || '{}')?.eventId === data.eventId &&
          JSON.parse(cart || '{}')?.vendors?.length && navigation.isReady()) {
        navigation.dispatch({ type: 'RESET', payload: {
          index: 1,
          routes: [{ name: 'dashboard' }, { name: 'cartmanagement' }],
        } });
      }
    };
    const handle = (response: Notifications.NotificationResponse) => {
      void openCart(response).catch(error => console.warn('Could not open saved cart', error));
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) handle(response);
    }).catch(error => console.warn('Could not read notification response', error));
    return () => subscription.remove();
  }, [loaded, navigation]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Toast />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sandwich1" options={{ headerShown: false }} />
        <Stack.Screen name="sandwich2" options={{ headerShown: false }} />
        <Stack.Screen name="sandwich3" options={{ headerShown: false }} />
        <Stack.Screen name="intro" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="selectrole" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="editprofile" options={{ headerShown: false }} />
        <Stack.Screen name="notificationacc" options={{ headerShown: false }} />
        <Stack.Screen name="feedbacknreview" options={{ headerShown: false }} />
        <Stack.Screen name="vendorcategories" options={{ headerShown: false }} />
        <Stack.Screen name="categoryvendorlisting" options={{ headerShown: false }} />
        <Stack.Screen name="bussinessselection" options={{ headerShown: false }} />
        <Stack.Screen name="makeupfilter" options={{ headerShown: false }} />
        <Stack.Screen name="vendorprofiledetails" options={{ headerShown: false }} />
        <Stack.Screen name="faqs" options={{ headerShown: false }} />
        <Stack.Screen name="termsofservices" options={{ headerShown: false }} />
        <Stack.Screen name="privacypolicy" options={{ headerShown: false }} />
        <Stack.Screen name="message" options={{ headerShown: false }} />
        <Stack.Screen name="splashscreen" options={{ headerShown: false }} />
        <Stack.Screen name="start" options={{ headerShown: false }} />
        <Stack.Screen name="packages" options={{ headerShown: false }} />
        <Stack.Screen name="images" options={{ headerShown: false }} />
        <Stack.Screen name="vendorreview" options={{ headerShown: false }} />
        <Stack.Screen name="bottomnotification" options={{ headerShown: false }} />
        <Stack.Screen name="bottommessages" options={{ headerShown: false }} />
        <Stack.Screen name="bdphotographer" options={{ headerShown: false }} />
        <Stack.Screen name="EventDetailsForm" options={{ headerShown: false }} />
        <Stack.Screen name="sponsoredcampaigns"  options={{ headerShown: false }} />
        <Stack.Screen name="AI" options={{ headerShown: false }} />
        <Stack.Screen name="AIPackage" options={{ headerShown: false }} />
        <Stack.Screen name="OrderReview" options={{ headerShown: false }} />
        <Stack.Screen name="OrderSummary" options={{ headerShown: false }} />
        <Stack.Screen name="paymentmethod" options={{ headerShown: false }} />
        <Stack.Screen name="creditcard" options={{ headerShown: false }} />
        <Stack.Screen name="jazzcash" options={{ headerShown: false }} />
        <Stack.Screen name="easypaisa" options={{ headerShown: false }} />
        <Stack.Screen name="paymentconfirmation" options={{ headerShown: false }} />
        <Stack.Screen name="vendorcontactdetails" options={{ headerShown: false }} />
        <Stack.Screen name="vendorprofilepending" options={{ headerShown: false, gestureEnabled: false, }}/>
        <Stack.Screen name="vendordashboard" options={{ headerShown: false }} />
        <Stack.Screen name="vendorpackages" options={{ headerShown: false }} />
        <Stack.Screen name="editpackage" options={{ headerShown: false }} />
        <Stack.Screen name="bdsalon" options={{ headerShown: false }} />
        <Stack.Screen name="bdcatering" options={{ headerShown: false }} />
        <Stack.Screen name="bdvenue" options={{ headerShown: false }} />
        <Stack.Screen name="bdcakes" options={{ headerShown: false }} />
        <Stack.Screen name="bdmehndi" options={{ headerShown: false }} />
        <Stack.Screen name="bdsounds" options={{ headerShown: false }} />
        <Stack.Screen name="imagesuploaded" options={{ headerShown: false }} />
        <Stack.Screen name="vendoraccount" options={{ headerShown: false }} />
        <Stack.Screen name="vendormessages" options={{ headerShown: false }} />
        <Stack.Screen name="vendornotifications" options={{ headerShown: false }} />
        <Stack.Screen name="vendorordersummary" options={{ headerShown: false }} />
        <Stack.Screen name="vendormyevents" options={{ headerShown: false }} />
        <Stack.Screen name="vendorfaqs" options={{ headerShown: false }} />
        <Stack.Screen name="customizeyourown" options={{ headerShown: false }} />
        <Stack.Screen name="e-card" options={{ headerShown: false }} />
        <Stack.Screen name="myevents" options={{ headerShown: false }} />
        <Stack.Screen name="reschedulebooking" options={{ headerShown: false }} />
        <Stack.Screen name="VPD" options={{ headerShown: false }} />
        <Stack.Screen name="vendoreditprofile" options={{ headerShown: false }} />
        <Stack.Screen name="contactus" options={{ headerShown: false }} />
        <Stack.Screen name="cartmanagement" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
