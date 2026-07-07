import { getSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import WelcomeImageDisplay from './WelcomeImageDisplay';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import postPushToken from '@/services/postPushToken';

const WelcomeIndex: React.FC = () => {
  useEffect(() => {
    const redirectUser = async () => {
      const userData = await getSecureData('user');
      if (!userData || !JSON.parse(userData || "")) {
        router.push('/intro');
      } else {
        try {
          const user = JSON.parse(userData || "");
          await registerForPushNotificationsAsync().then(token => {
            console.log("Token", token);
            if (token) {
              push(token, user._id)
            }
          });
          if (user.role === 'Vendor') {
            router.push('/vendordashboard');
          } else if (user.role === 'Organizer') {
            router.push('/dashboard');
          } else {
            router.push('/splashscreen'); // fallback for unknown role
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          router.push('/login');
        }
      }
    };

    setTimeout(() => {
      redirectUser();
      //router.push("/vendoreditprofile");
    }, 1000);
  }, []);

  useEffect(() => {
    // registerForPushNotificationsAsync().then(token => {
    //   console.log("Token", token);
    //   if (token) {
    //     push(token)
    //   }
    // });
  }, []);

  const push = async (token: string, userId: string) => {
    await postPushToken(userId, token);
  }

  return (
    <View>
      <WelcomeImageDisplay imageUri="https://cdn.builder.io/api/v1/image/assets/TEMP/ee8619c3ba7069ac2ac92e880c53f6a08b69c1a800aaf83f5653c512dd5631a5?apiKey=0a92af3bc6e24da3a9ef8b1ae693931a&" />
    </View>
  );
};

export default WelcomeIndex;
