import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f0f3f6' },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="map" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="boxes" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
