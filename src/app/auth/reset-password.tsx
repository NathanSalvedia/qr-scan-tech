import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { authService } from "@/services/auth";
import { authState } from "@/services/auth-state";

export default function ResetPasswordScreen() {
  const defaultEmail = authState.getEmail() || "";
  const [email, setEmail] = useState(defaultEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isWeb = Platform.OS === "web";

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (isWeb) {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, [{ text: "OK", onPress: onOk }]);
    }
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showAlert("Missing Email", "Please enter your email address.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showAlert("Invalid Password", "New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Password Mismatch", "New passwords do not match. Please verify.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.resetPassword(cleanEmail, newPassword);

      if (!res.success) {
        showAlert("Reset Failed", res.message || res.error || "Could not reset password.");
        return;
      }

      showAlert(
        "Success!",
        "Your password has been reset successfully. You can now sign in with your new password.",
        () => {
          router.replace("/auth/sign-in");
        }
      );
    } catch (err: any) {
      showAlert("Error", err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
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
            paddingHorizontal: isWeb ? 16 : 24,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            className={
              isWeb
                ? "w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-300/40 border border-slate-200/70 self-center my-auto"
                : "w-full max-w-sm self-center"
            }
          >
            {/* Top Brand Icon */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-2xl bg-[#4d6029] items-center justify-center shadow-sm mb-4">
                <MaterialCommunityIcons name="lock-reset" size={32} color="#ffffff" />
              </View>
              <Text className="text-3xl font-poppins-bold text-[#0f172a] tracking-tight text-center">
                Create New Password
              </Text>
              <Text className="text-[#64748b] text-sm mt-1 font-poppins-medium text-center px-2">
                Set your new account password to regain access.
              </Text>
            </View>

            {/* Form Fields */}
            <View className="w-full">
              {/* Email Address */}
              <View className="mb-4">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-1.5">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 border border-slate-200">
                  <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 text-[#0f172a] ml-3 text-sm font-poppins"
                  />
                </View>
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-1.5">
                  New Password
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 border border-slate-200">
                  <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                  <TextInput
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#94a3b8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    className="flex-1 text-[#0f172a] ml-3 text-sm font-poppins"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm New Password */}
              <View className="mb-6">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-1.5">
                  Confirm New Password
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 border border-slate-200">
                  <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                  <TextInput
                    placeholder="Re-enter your new password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 text-[#0f172a] ml-3 text-sm font-poppins"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
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
                      Updating Password...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white font-poppins-bold text-base">
                    Save New Password
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back to Sign In */}
              <View className="flex-row items-center justify-center">
                <Text className="text-[#64748b] text-sm font-poppins">
                  Remember your password?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace("/auth/sign-in")}
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
