import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/services/auth-state';

export default function UserLayout() {
  const { isAuthenticated, isHydrated } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      router.replace('/auth/sign-in');
    }
  }, [isAuthenticated, isHydrated]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <View className="flex-1 bg-[#f8fafc] items-center justify-center">
        <ActivityIndicator size="small" color="#4d6029" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        <Stack.Screen name="dashboard" options={{ animation: 'none' }} />
        <Stack.Screen name="map" options={{ animation: 'none' }} />
        <Stack.Screen name="scanner" options={{ animation: 'none' }} />
        <Stack.Screen name="boxes" options={{ animation: 'none' }} />
        <Stack.Screen name="box-details" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" options={{ animation: 'none' }} />
        <Stack.Screen name="scan-sound" options={{ animation: 'none' }} />
        <Stack.Screen name="change-password" options={{ animation: 'none' }} />
      </Stack>
    </View>
  );
}
