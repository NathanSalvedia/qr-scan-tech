import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authService } from "@/services/auth";
import { authState } from "@/services/auth-state";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeSentModal, setShowCodeSentModal] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const handleProceedToOtp = () => {
    setShowCodeSentModal(false);
    router.push("/auth/otp");
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Required Field", "Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.forgotPassword(cleanEmail);

      if (!res.success) {
        Alert.alert("Request Failed", res.message || res.error || "No account found with this email.");
        return;
      }

      setIsSubmitted(true);
      authState.setAuthTarget(cleanEmail, "reset");
      setSentEmail(cleanEmail);
      setShowCodeSentModal(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style={showCodeSentModal ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-sm self-center">
            {/* Top Brand Icon */}
            <View className="items-center mb-8">
              <View className="w-16 h-16 rounded-2xl bg-[#4d6029] items-center justify-center shadow-sm mb-4">
                <MaterialCommunityIcons
                  name="lock-reset"
                  size={32}
                  color="#ffffff"
                />
              </View>
              <Text className="text-3xl font-poppins-bold text-[#0f172a] tracking-tight text-center">
                Forgot Password?
              </Text>
              <Text className="text-[#64748b] text-sm mt-2 font-poppins-medium text-center px-2 leading-5">
                Enter the email associated with your account and we&apos;ll send you a link to reset your password.
              </Text>
            </View>

            {/* Form Fields */}
            <View className="w-full">
              {/* Email Field */}
              <View className="mb-6">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                  Email Address:
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm shadow-slate-200/50">
                  <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (isSubmitted) setIsSubmitted(false);
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 text-[#0f172a] ml-3 text-sm font-poppins"
                  />
                </View>
              </View>

              {/* Reset Password Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isLoading}
                className={`bg-[#4d6029] active:opacity-90 py-4 rounded-2xl items-center justify-center shadow-md mb-6 ${
                  isLoading ? "opacity-75" : ""
                }`}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text className="text-white font-poppins-bold text-base ml-2">
                      Sending Code...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white font-poppins-bold text-base">
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back to Sign In Link */}
              <View className="flex-row items-center justify-center mb-2">
                <Text className="text-[#64748b] text-sm font-poppins">
                  Remember your password?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/auth/sign-in")}
                  activeOpacity={0.7}
                >
                  <Text className="text-[#4d6029] font-poppins-bold text-sm">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Verification Code Sent Modal */}
      <Modal
        visible={showCodeSentModal}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowCodeSentModal(false)}
      >
        <View
          style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
          className="flex-1 items-center justify-center p-5"
        >
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 items-center">
            {/* Top Close Button */}
            <View className="w-full flex-row justify-end -mt-1 -mr-1 mb-1">
              <TouchableOpacity
                onPress={() => setShowCodeSentModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Success Icon */}
            <View className="w-16 h-16 rounded-3xl bg-[#4d6029]/10 items-center justify-center mb-4">
              <MaterialCommunityIcons
                name="email-check-outline"
                size={34}
                color="#4d6029"
              />
            </View>

            {/* Modal Title */}
            <Text className="text-xl font-poppins-bold text-[#0f172a] text-center mb-1.5">
              Verification Code Sent
            </Text>

            {/* Subtitle / Email */}
            <Text className="text-xs font-poppins text-[#64748b] text-center mb-3 leading-relaxed px-2">
              A 6-digit password reset code has been sent to:
            </Text>

            {/* Email Highlight Box */}
            <View className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-3.5 flex-row items-center justify-center">
              <Ionicons name="mail" size={16} color="#4d6029" />
              <Text
                className="text-xs font-poppins-bold text-[#0f172a] ml-2 shrink"
                numberOfLines={1}
              >
                {sentEmail || email}
              </Text>
            </View>

            {/* Informational Hint */}
            <View className="w-full bg-[#FCF0DA] border border-[#edd5a6] rounded-2xl p-3 mb-5 flex-row items-center">
              <Ionicons
                name="information-circle"
                size={16}
                color="#78350f"
              />
              <Text className="text-[11px] font-poppins text-[#78350f] ml-2 flex-1 leading-4">
                Please check your inbox and spam folder. The code expires in 10 minutes.
              </Text>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleProceedToOtp}
              className="w-full bg-[#4d6029] active:opacity-90 py-3.5 rounded-2xl items-center justify-center flex-row shadow-sm shadow-[#4d6029]/30 mb-2"
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={18} color="#ffffff" />
              <Text className="text-white text-sm font-poppins-bold ml-2">
                Enter Verification Code
              </Text>
            </TouchableOpacity>

            {/* Secondary Action / Change Email */}
            <TouchableOpacity
              onPress={() => setShowCodeSentModal(false)}
              className="py-2 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-poppins-semibold text-[#64748b]">
                Didn&apos;t receive it? Re-enter email
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
