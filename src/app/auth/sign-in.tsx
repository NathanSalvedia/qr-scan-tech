import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

type UserRole = 'TECHNICIAN' | 'ADMIN';

export default function SignInScreen() {
  const [role, setRole] = useState<UserRole>('TECHNICIAN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSignIn = () => {
    // UI placeholder for authentication flow
    alert(`Signing in as ${role === 'ADMIN' ? 'Administrator' : 'Technician'} (${email || 'demo user'})`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6 py-8"
        >
          {/* Top Brand Header with QR Icon */}
          <View className="items-center mt-4 mb-6">
            <View className="w-24 h-24 rounded-3xl bg-sky-500/10 border-2 border-sky-500/30 items-center justify-center shadow-lg shadow-sky-500/20 mb-4">
              <MaterialCommunityIcons name="qrcode-scan" size={48} color="#0284c7" />
            </View>
            <Text className="text-2xl font-bold text-white tracking-wide">
              QR Scanner
            </Text>
            <Text className="text-slate-400 text-sm mt-1 text-center">
              Field Technician & Infrastructure Management
            </Text>
          </View>

          {/* Role Switcher Pill */}
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex-row mb-6">
            <TouchableOpacity
              onPress={() => setRole('TECHNICIAN')}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center space-x-2 ${
                role === 'TECHNICIAN' ? 'bg-sky-600 shadow-md shadow-sky-600/30' : ''
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name="construct-outline"
                size={18}
                color={role === 'TECHNICIAN' ? '#ffffff' : '#94a3b8'}
              />
              <Text
                className={`font-semibold ml-2 text-sm ${
                  role === 'TECHNICIAN' ? 'text-white' : 'text-slate-400'
                }`}
              >
                Technician
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole('ADMIN')}
              className={`flex-1 py-3 rounded-xl flex-row items-center justify-center space-x-2 ${
                role === 'ADMIN' ? 'bg-sky-600 shadow-md shadow-sky-600/30' : ''
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={role === 'ADMIN' ? '#ffffff' : '#94a3b8'}
              />
              <Text
                className={`font-semibold ml-2 text-sm ${
                  role === 'ADMIN' ? 'text-white' : 'text-slate-400'
                }`}
              >
                Admin Panel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Form Card */}
          <View className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl shadow-black/40">
            <Text className="text-xl font-bold text-white mb-1">Welcome Back</Text>
            <Text className="text-slate-400 text-xs mb-5">
              Sign in to your {role === 'ADMIN' ? 'Admin' : 'Technician'} account
            </Text>

            {/* Email / Username Field */}
            <View className="mb-4">
              <Text className="text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">
                {role === 'ADMIN' ? 'Admin Email' : 'Technician Email / ID'}
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 focus:border-sky-500">
                <Ionicons name="mail-outline" size={20} color="#64748b" />
                <TextInput
                  placeholder={role === 'ADMIN' ? 'admin@telecom.com' : 'tech.john@telecom.com'}
                  placeholderTextColor="#475569"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 text-white ml-3 text-sm"
                />
              </View>
            </View>

            {/* Password Field */}
            <View className="mb-4">
              <Text className="text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">
                Password
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 focus:border-sky-500">
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                <TextInput
                  placeholder="••••••••••••"
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white ml-3 text-sm"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Helper Options: Remember Me & Forgot Password */}
            <View className="flex-row items-center justify-between mb-6">
              <TouchableOpacity
                onPress={() => setRememberMe(!rememberMe)}
                className="flex-row items-center"
                activeOpacity={0.7}
              >
                <View
                  className={`w-4 h-4 rounded border items-center justify-center mr-2 ${
                    rememberMe ? 'bg-sky-500 border-sky-500' : 'border-slate-600 bg-slate-950'
                  }`}
                >
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                </View>
                <Text className="text-slate-400 text-xs">Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-sky-400 text-xs font-medium">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSignIn}
              className="bg-sky-600 active:bg-sky-700 py-3.5 rounded-xl items-center justify-center flex-row shadow-lg shadow-sky-600/30"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-base mr-2">
                Sign In as {role === 'ADMIN' ? 'Admin' : 'Technician'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Footer - Switch to Sign Up */}
          <View className="flex-row items-center justify-center mt-8 space-x-1">
            <Text className="text-slate-400 text-sm">Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')} activeOpacity={0.7}>
              <Text className="text-sky-400 font-semibold text-sm ml-1">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
