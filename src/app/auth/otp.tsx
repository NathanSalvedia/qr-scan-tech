import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function OtpVerificationScreen() {
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const userEmail = params.email || 'nathansalvedia2002@gmail.com';
  const mode = params.mode || 'verification';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);

  const isResendActive = resendTimer === 0;
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const isWeb = Platform.OS === 'web';

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    // Handle multiple digits pasted
    if (value.length > 1) {
      const digits = value.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, idx) => {
        newOtp[idx] = digit;
      });
      setOtp(newOtp);

      const nextFocus = Math.min(digits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const cleanDigit = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanDigit;
    setOtp(newOtp);

    // Auto-advance focus
    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = () => {
    if (!isResendActive) return;

    setOtp(['', '', '', '', '', '']);
    setResendTimer(60);
    inputRefs.current[0]?.focus();

    if (isWeb) {
      window.alert(`A new 6-digit verification code has been sent to ${userEmail}.`);
    } else {
      Alert.alert('Code Resent', `A new 6-digit verification code has been sent to ${userEmail}.`);
    }
  };

  const handleVerifyOtp = () => {
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      if (isWeb) {
        window.alert('Please enter the complete 6-digit verification code.');
      } else {
        Alert.alert('Incomplete Code', 'Please enter the complete 6-digit verification code.');
      }
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      const cleanEmail = userEmail.toLowerCase().trim();

      if (isWeb) {
        window.alert('Email verified successfully! Welcome to MultiFactors Network.');
      } else {
        Alert.alert('Verification Successful', 'Your email has been verified successfully.');
      }

      if (cleanEmail === 'admin@multifactors.ph' || cleanEmail === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/user/dashboard');
      }
    }, 800);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: isWeb ? 16 : 24,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card wrapper */}
          <View
            className={
              isWeb
                ? 'w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-300/40 border border-slate-200/70 self-center my-auto'
                : 'w-full max-w-sm self-center'
            }
          >
            {/* Top Brand Icon */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-2xl bg-[#4d6029] items-center justify-center shadow-md shadow-[#4d6029]/30 mb-4">
                <MaterialCommunityIcons
                  name="email-check-outline"
                  size={32}
                  color="#ffffff"
                />
              </View>

              <Text className="text-2xl sm:text-3xl font-poppins-bold text-[#0f172a] tracking-tight text-center">
                {mode === 'reset' ? 'Password Reset Code' : 'Verify Your Email'}
              </Text>

              <Text className="text-[#64748b] text-xs sm:text-sm mt-2 font-poppins text-center px-1 leading-5">
                We sent a 6-digit verification code to
              </Text>

              <View className="bg-slate-100/90 border border-slate-200/80 px-3 py-1 rounded-xl mt-1.5 flex-row items-center">
                <Ionicons name="mail" size={13} color="#4d6029" />
                <Text className="text-xs font-poppins-semibold text-[#0f172a] ml-1.5">
                  {userEmail}
                </Text>
              </View>
            </View>

            {/* 6-Box OTP Inputs */}
            <View className="w-full mb-6">
              <Text className="text-[#1e293b] text-xs font-poppins-semibold mb-3 text-center">
                Enter 6-Digit Code:
              </Text>

              <View className="flex-row justify-between items-center gap-1.5 sm:gap-2">
                {otp.map((digit, idx) => {
                  const isFilled = !!digit;
                  return (
                    <TextInput
                      key={idx}
                      ref={(ref) => {
                        inputRefs.current[idx] = ref;
                      }}
                      value={digit}
                      onChangeText={(val) => handleOtpChange(val, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-2xl border transition-all ${
                        isFilled
                          ? 'bg-emerald-50/70 border-[#4d6029] text-[#4d6029]'
                          : 'bg-white border-slate-200 text-[#0f172a] shadow-xs'
                      }`}
                    />
                  );
                })}
              </View>
            </View>

            {/* Resend Countdown Timer */}
            <View className="items-center mb-6">
              {isResendActive ? (
                <View className="flex-row items-center">
                  <Text className="text-xs font-poppins text-[#64748b]">
                    Didn&apos;t receive the code?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendCode}
                    activeOpacity={0.7}
                    className="flex-row items-center"
                  >
                    <Ionicons name="refresh" size={13} color="#4d6029" />
                    <Text className="text-xs font-poppins-bold text-[#4d6029] ml-1">
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={14} color="#94a3b8" />
                  <Text className="text-xs font-poppins text-[#64748b] ml-1">
                    Resend code in{' '}
                    <Text className="font-poppins-bold text-[#4d6029]">
                      00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Primary Verification Action Button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={isVerifying}
              className={`bg-[#4d6029] active:opacity-90 py-3.5 sm:py-4 rounded-2xl items-center justify-center shadow-md shadow-[#4d6029]/30 mb-5 flex-row ${
                isVerifying ? 'opacity-80' : ''
              }`}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isVerifying ? 'sync' : 'shield-checkmark'}
                size={18}
                color="#ffffff"
              />
              <Text className="text-white font-poppins-bold text-sm sm:text-base ml-2">
                {isVerifying ? 'Verifying Code...' : 'Verify & Continue'}
              </Text>
            </TouchableOpacity>

            {/* Back to Sign In or Sign Up */}
            <View className="flex-row items-center justify-center">
              <TouchableOpacity
                onPress={() => router.replace('/auth/sign-in')}
                className="flex-row items-center py-1"
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={15} color="#64748b" />
                <Text className="text-[#64748b] font-poppins-medium text-xs sm:text-sm ml-1">
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
