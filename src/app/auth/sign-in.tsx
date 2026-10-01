import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isWeb = Platform.OS === "web";

  const handleSignIn = () => {
    const cleanEmail = email.trim().toLowerCase();
    // Route admin account to Admin Console, all technician accounts (including nathansalvedia2002@gmail.com) to Field Technician Dashboard
    if (cleanEmail === 'admin@multifactors.ph' || cleanEmail === 'admin') {
      router.replace('/admin/dashboard' as any);
    } else {
      router.replace('/user/dashboard' as any);
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
          {/* Card wrapper for Web, simple wrapper for Mobile */}
          <View
            className={
              isWeb
                ? "w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-300/40 border border-slate-200/70 self-center my-auto"
                : "w-full max-w-sm self-center"
            }
          >
            {/* Top Brand QR Icon */}
            <View className="items-center mb-8">
              <View className="w-16 h-16 rounded-2xl bg-[#4d6029] items-center justify-center shadow-sm mb-4">
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={32}
                  color="#ffffff"
                />
              </View>
              <Text className="text-3xl font-poppins-bold text-[#0f172a] tracking-tight text-center">
                Welcome Back!
              </Text>
              <Text className="text-[#64748b] text-sm mt-1.5 font-poppins-medium text-center">
                Sign in to continue
              </Text>
            </View>

            {/* Form Fields */}
            <View className="w-full">
              {/* Email Field */}
              <View className="mb-4">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                  Email:
                </Text>
                <View
                  className={`flex-row items-center rounded-2xl px-4 py-2.5 border shadow-sm ${
                    isWeb
                      ? "bg-[#f8fafc] border-slate-200 shadow-none"
                      : "bg-white border-slate-100 shadow-slate-200/50"
                  }`}
                >
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

              {/* Password Field */}
              <View className="mb-2">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                  Password:
                </Text>
                <View
                  className={`flex-row items-center rounded-2xl px-4 py-2.5 border shadow-sm ${
                    isWeb
                      ? "bg-[#f8fafc] border-slate-200 shadow-none"
                      : "bg-white border-slate-100 shadow-slate-200/50"
                  }`}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#94a3b8"
                  />
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    className="flex-1 text-[#0f172a] ml-3 text-sm font-poppins"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password Link */}
              <View className="items-end mb-6">
                <TouchableOpacity
                  onPress={() => router.push("/auth/forgot-password")}
                  activeOpacity={0.7}
                >
                  <Text className="text-[#4d6029] text-sm font-poppins-semibold">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleSignIn}
                className="bg-[#4d6029] active:opacity-90 py-4 rounded-2xl items-center justify-center shadow-md shadow-[#4d6029]/30 mb-4"
                activeOpacity={0.85}
              >
                <Text className="text-white font-poppins-bold text-base">
                  Sign In
                </Text>
              </TouchableOpacity>

              {/* Sign Up Link: Mobile Only */}
              {!isWeb && (
                <View className="flex-row items-center justify-center mt-2 mb-2">
                  <Text className="text-[#64748b] text-sm font-poppins">
                    Don&apos;t have an account?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/auth/sign-up")}
                    activeOpacity={0.7}
                  >
                    <Text className="text-[#4d6029] font-poppins-bold text-sm">
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
