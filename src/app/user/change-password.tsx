import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { authService } from '@/services/auth';

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const isLengthValid = newPassword.length >= 8 && newPassword.length <= 12;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    isLengthValid &&
    isMatching &&
    !isSubmitting;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword.length > 12) {
      setErrorMessage('New password must not exceed 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (res.success) {
        setSuccessMessage('Your password has been successfully updated!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowSuccessModal(true);
      } else {
        setErrorMessage(
          res.message || 'Failed to update password. Please check your current password.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error updating password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-4 pt-3 max-w-[600px] w-full self-center">
          {/* Top Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 items-center justify-center mr-3 shadow-sm active:bg-slate-100"
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color="#0f172a" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-[11px] font-poppins-semibold tracking-wider text-[#64748b] uppercase">
                  Account Security
                </Text>
                <Text className="text-xl font-poppins-bold text-[#0f172a] mt-0.5">
                  Change Password
                </Text>
              </View>
            </View>
            <View className="w-10 h-10 rounded-2xl bg-[#4d6029]/10 items-center justify-center border border-[#4d6029]/20">
              <Ionicons name="shield-checkmark-outline" size={20} color="#4d6029" />
            </View>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 36 }}
          >
            {/* Informational Security Card */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-200/80 shadow-sm shadow-slate-200/40 flex-row items-start">
              <View className="w-9 h-9 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-3 border border-[#4d6029]/20 mt-0.5">
                <Ionicons name="key" size={18} color="#4d6029" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-poppins-bold text-[#0f172a]">
                  Protect Your Account
                </Text>
                <Text className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5 leading-relaxed">
                  Choose a secure password between 8 to 12 characters that you do not use for other services.
                </Text>
              </View>
            </View>

            {/* Error Banner */}
            {errorMessage && (
              <View className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-4 flex-row items-center">
                <Ionicons name="alert-circle" size={18} color="#e11d48" style={{ marginRight: 8 }} />
                <Text className="text-xs font-poppins-medium text-rose-800 flex-1 leading-relaxed">
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Success Banner */}
            {successMessage && (
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-4 flex-row items-center">
                <Ionicons name="checkmark-circle" size={18} color="#059669" style={{ marginRight: 8 }} />
                <Text className="text-xs font-poppins-medium text-emerald-800 flex-1 leading-relaxed">
                  {successMessage}
                </Text>
              </View>
            )}

            {/* Password Form Card */}
            <View className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm shadow-slate-200/40 mb-5">
              {/* Field 1: Current Password */}
              <View className="mb-4">
                <Text className="text-xs font-poppins-bold text-[#334155] mb-2">
                  Current Password
                </Text>
                <View className="bg-slate-50 rounded-xl px-3.5 py-2.5 flex-row items-center border border-slate-200">
                  <Ionicons name="lock-closed-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    secureTextEntry={!showCurrent}
                    placeholder="Enter current password"
                    placeholderTextColor="#94a3b8"
                    value={currentPassword}
                    onChangeText={(val) => {
                      setCurrentPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    editable={!isSubmitting}
                    className="flex-1 text-xs font-poppins-medium text-[#0f172a] p-0"
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrent(!showCurrent)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Field 2: New Password */}
              <View className="mb-4">
                <Text className="text-xs font-poppins-bold text-[#334155] mb-2">
                  New Password
                </Text>
                <View className="bg-slate-50 rounded-xl px-3.5 py-2.5 flex-row items-center border border-slate-200">
                  <Ionicons name="key-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    secureTextEntry={!showNew}
                    placeholder="Enter new password (8-12 characters)"
                    placeholderTextColor="#94a3b8"
                    value={newPassword}
                    maxLength={12}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    editable={!isSubmitting}
                    className="flex-1 text-xs font-poppins-medium text-[#0f172a] p-0"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew(!showNew)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showNew ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>

                {/* Length Requirement Tag */}
                <View className="flex-row items-center mt-2 ml-1">
                  <Ionicons
                    name={isLengthValid ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={isLengthValid ? '#059669' : '#94a3b8'}
                  />
                  <Text
                    className={`text-[10px] font-poppins-medium ml-1.5 ${
                      isLengthValid ? 'text-emerald-700 font-poppins-semibold' : 'text-[#64748b]'
                    }`}
                  >
                    8 to 12 characters ({newPassword.length}/12)
                  </Text>
                </View>
              </View>

              {/* Field 3: Confirm New Password */}
              <View className="mb-2">
                <Text className="text-xs font-poppins-bold text-[#334155] mb-2">
                  Confirm New Password
                </Text>
                <View className="bg-slate-50 rounded-xl px-3.5 py-2.5 flex-row items-center border border-slate-200">
                  <Ionicons name="checkmark-done-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    secureTextEntry={!showConfirm}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    maxLength={12}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    editable={!isSubmitting}
                    className="flex-1 text-xs font-poppins-medium text-[#0f172a] p-0"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>

                {/* Match Requirement Tag */}
                {confirmPassword.length > 0 && (
                  <View className="flex-row items-center mt-2 ml-1">
                    <Ionicons
                      name={isMatching ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={isMatching ? '#059669' : '#e11d48'}
                    />
                    <Text
                      className={`text-[10px] font-poppins-medium ml-1.5 ${
                        isMatching ? 'text-emerald-700 font-poppins-semibold' : 'text-rose-700'
                      }`}
                    >
                      {isMatching ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`rounded-2xl py-3.5 px-4 flex-row items-center justify-center shadow-sm mb-3 ${
                canSubmit
                  ? 'bg-[#4d6029] active:opacity-90'
                  : 'bg-slate-200'
              }`}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={canSubmit ? '#ffffff' : '#94a3b8'}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                className={`text-sm font-poppins-bold ${
                  canSubmit ? 'text-white' : 'text-[#94a3b8]'
                }`}
              >
                {isSubmitting ? 'Updating Password...' : 'Save New Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              disabled={isSubmitting}
              className="py-2.5 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-poppins-semibold text-[#64748b]">
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Customized Password Update Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View className="flex-1 bg-slate-900/60 justify-center items-center px-4">
          <View
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl items-center border border-slate-100"
            style={{
              elevation: 20,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
            }}
          >
            {/* Success Icon */}
            <View className="w-16 h-16 rounded-3xl bg-[#4d6029]/10 border border-[#4d6029]/20 items-center justify-center mb-4">
              <MaterialCommunityIcons
                name="check-decagram"
                size={38}
                color="#4d6029"
              />
            </View>

            {/* Modal Title */}
            <Text className="text-xl font-poppins-bold text-[#0f172a] text-center mb-1.5">
              Password Changed!
            </Text>

            {/* Subtitle / Description */}
            <Text className="text-xs font-poppins text-[#64748b] text-center mb-5 leading-relaxed px-2">
              Your password has been successfully updated. You can continue using your account securely.
            </Text>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              className="w-full bg-[#4d6029] active:opacity-90 py-3.5 rounded-2xl items-center justify-center flex-row shadow-sm shadow-[#4d6029]/30"
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
              <Text className="text-white text-sm font-poppins-bold ml-2">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
