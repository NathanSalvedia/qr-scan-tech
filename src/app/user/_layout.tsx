import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
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
      <Stack.Screen name="profile" options={{ animation: 'none' }} />
    </Stack>
  );
}
