import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f0f3f6' },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="box-management" />
      <Stack.Screen name="qr-print" />
      <Stack.Screen name="technicians" />
      <Stack.Screen name="activity-logs" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
