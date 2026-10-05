import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = () => {
    if (!email.trim()) {
      Alert.alert("Required Field", "Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setIsSubmitted(true);
    Alert.alert(
      "Verification Code Sent",
      `A 6-digit password reset code has been sent to ${email.trim()}.`,
      [
        {
          text: "Enter OTP Code",
          onPress: () =>
            router.push({
              pathname: "/auth/otp",
              params: { email: email.trim(), mode: "reset" },
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />
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
                className="bg-[#4d6029] active:opacity-90 py-4 rounded-2xl items-center justify-center shadow-md shadow-[#4d6029]/30 mb-6"
                activeOpacity={0.85}
              >
                <Text className="text-white font-poppins-bold text-base">
                  Send Reset Link
                </Text>
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
    </SafeAreaView>
  );
}
