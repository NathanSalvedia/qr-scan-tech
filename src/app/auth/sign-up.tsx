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

export default function SignUpScreen() {
  const [role, setRole] = useState<UserRole>('TECHNICIAN');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const handleSignUp = () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    alert(`Account created for ${fullName} (${role})`);
    router.replace('/auth/sign-in');
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
          <View className="items-center mt-2 mb-5">
            <View className="w-20 h-20 rounded-3xl bg-sky-500/10 border-2 border-sky-500/30 items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
              <MaterialCommunityIcons name="qrcode-plus" size={42} color="#0284c7" />
            </View>
            <Text className="text-2xl font-bold text-white tracking-wide">
              Create Account
            </Text>
            <Text className="text-slate-400 text-xs mt-1 text-center">
              Register for Distribution Box Infrastructure System
            </Text>
          </View>

          {/* Role Selection Pill */}
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex-row mb-5">
            <TouchableOpacity
              onPress={() => setRole('TECHNICIAN')}
              className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${
                role === 'TECHNICIAN' ? 'bg-sky-600 shadow-md shadow-sky-600/30' : ''
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name="construct-outline"
                size={16}
                color={role === 'TECHNICIAN' ? '#ffffff' : '#94a3b8'}
              />
              <Text
                className={`font-semibold ml-2 text-xs ${
                  role === 'TECHNICIAN' ? 'text-white' : 'text-slate-400'
                }`}
              >
                Technician
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole('ADMIN')}
              className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${
                role === 'ADMIN' ? 'bg-sky-600 shadow-md shadow-sky-600/30' : ''
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={role === 'ADMIN' ? '#ffffff' : '#94a3b8'}
              />
              <Text
                className={`font-semibold ml-2 text-xs ${
                  role === 'ADMIN' ? 'text-white' : 'text-slate-400'
                }`}
              >
                Admin Role
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Form Card */}
          <View className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl shadow-black/40">
            {/* Full Name Field */}
            <View className="mb-3.5">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Full Name
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                <Ionicons name="person-outline" size={18} color="#64748b" />
                <TextInput
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor="#475569"
                  value={fullName}
                  onChangeText={setFullName}
                  className="flex-1 text-white ml-3 text-sm"
                />
              </View>
            </View>

            {/* Email Field */}
            <View className="mb-3.5">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Work Email
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                <Ionicons name="mail-outline" size={18} color="#64748b" />
                <TextInput
                  placeholder="alex.johnson@telecom.com"
                  placeholderTextColor="#475569"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 text-white ml-3 text-sm"
                />
              </View>
            </View>

            {/* Employee / Tech ID Field */}
            <View className="mb-3.5">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                {role === 'ADMIN' ? 'Admin Badge / ID' : 'Technician License / ID'}
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                <Ionicons name="card-outline" size={18} color="#64748b" />
                <TextInput
                  placeholder={role === 'ADMIN' ? 'ADM-2026-01' : 'TECH-2026-89'}
                  placeholderTextColor="#475569"
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  autoCapitalize="characters"
                  className="flex-1 text-white ml-3 text-sm"
                />
              </View>
            </View>

            {/* Password Field */}
            <View className="mb-3.5">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Password
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                <TextInput
                  placeholder="At least 8 characters"
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white ml-3 text-sm"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View className="mb-4">
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Confirm Password
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
                <TextInput
                  placeholder="Re-enter password"
                  placeholderTextColor="#475569"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white ml-3 text-sm"
                />
              </View>
            </View>

            {/* Agree Terms Checkbox */}
            <TouchableOpacity
              onPress={() => setAgreeTerms(!agreeTerms)}
              className="flex-row items-center mb-5"
              activeOpacity={0.7}
            >
              <View
                className={`w-4 h-4 rounded border items-center justify-center mr-2 ${
                  agreeTerms ? 'bg-sky-500 border-sky-500' : 'border-slate-600 bg-slate-950'
                }`}
              >
                {agreeTerms && <Ionicons name="checkmark" size={12} color="#ffffff" />}
              </View>
              <Text className="text-slate-400 text-xs flex-1">
                I agree to the Infrastructure Security & Audit terms.
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              className="bg-sky-600 active:bg-sky-700 py-3.5 rounded-xl items-center justify-center flex-row shadow-lg shadow-sky-600/30"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-base mr-2">Create Account</Text>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Footer - Switch to Sign In */}
          <View className="flex-row items-center justify-center mt-6 mb-4 space-x-1">
            <Text className="text-slate-400 text-sm">Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-in')} activeOpacity={0.7}>
              <Text className="text-sky-400 font-semibold text-sm ml-1">Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
