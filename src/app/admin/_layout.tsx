import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { View, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '@/services/auth-state';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    // 1. If not authenticated at all -> redirect to sign in
    if (!isAuthenticated) {
      if (Platform.OS === 'web') {
        window.alert('Authentication Required: Please sign in to access the Admin Panel.');
      } else {
        Alert.alert('Authentication Required', 'Please sign in to access the Admin Panel.');
      }
      router.replace('/auth/sign-in');
      return;
    }

    // 2. If authenticated but role is NOT admin -> block and redirect to user dashboard
    if (!isAdmin) {
      if (Platform.OS === 'web') {
        window.alert('Access Denied: Only administrators have access to this area.');
      } else {
        Alert.alert('Access Denied', 'Only administrators have access to this area.');
      }
      router.replace('/user/dashboard');
    }
  }, [isAuthenticated, isAdmin]);

  // Guard view: If unauthenticated or non-admin, render loading / access check state
  if (!isAuthenticated || !isAdmin) {
    return (
      <View className="flex-1 bg-[#f0f3f6] items-center justify-center p-6">
        <View className="bg-white p-8 rounded-3xl items-center shadow-lg max-w-sm w-full border border-slate-200">
          <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
            <MaterialCommunityIcons name="shield-lock-outline" size={32} color="#dc2626" />
          </View>
          <Text className="text-xl font-bold text-slate-800 text-center mb-2">
            Verifying Admin Access
          </Text>
          <Text className="text-sm text-slate-500 text-center mb-6">
            Checking permissions for your account...
          </Text>
          <ActivityIndicator size="small" color="#4d6029" />
        </View>
      </View>
    );
  }

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
