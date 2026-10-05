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

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required Fields", "Please enter your first and last name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Required Fields", "Please enter your email address.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Required Fields", "Please enter your phone number.");
      return;
    }
    if (!password) {
      Alert.alert("Required Fields", "Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Passwords do not match. Please verify.",
      );
      return;
    }
    Alert.alert(
      "Account Created",
      `Welcome ${firstName} ${lastName}! A 6-digit verification code has been sent to ${email.trim()}.`,
      [
        {
          text: "Verify Email",
          onPress: () =>
            router.push({
              pathname: "/auth/otp",
              params: { email: email.trim(), mode: "signup" },
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
            {/* Top Brand QR Icon */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-2xl bg-[#4d6029] items-center justify-center shadow-sm mb-3">
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={32}
                  color="#ffffff"
                />
              </View>
              <Text className="text-3xl font-poppins-bold text-[#0f172a] tracking-tight text-center">
                Create Account
              </Text>
              <Text className="text-[#64748b] text-sm mt-1 font-poppins-medium text-center">
                Sign up to get started
              </Text>
            </View>

            {/* Form Fields Container */}
            <View className="w-full">
              {/* First Name & Last Name (Two Columns) */}
              <View className="flex-row gap-3 mb-4">
                {/* First Name */}
                <View className="flex-1">
                  <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                    First Name
                  </Text>
                  <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm shadow-slate-200/50">
                    <Ionicons name="person-outline" size={18} color="#94a3b8" />
                    <TextInput
                      placeholder="First name"
                      placeholderTextColor="#94a3b8"
                      value={firstName}
                      onChangeText={setFirstName}
                      className="flex-1 text-[#0f172a] ml-2.5 text-sm font-poppins"
                    />
                  </View>
                </View>

                {/* Last Name */}
                <View className="flex-1">
                  <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                    Last Name
                  </Text>
                  <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm shadow-slate-200/50">
                    <Ionicons name="person-outline" size={18} color="#94a3b8" />
                    <TextInput
                      placeholder="Last name"
                      placeholderTextColor="#94a3b8"
                      value={lastName}
                      onChangeText={setLastName}
                      className="flex-1 text-[#0f172a] ml-2.5 text-sm font-poppins"
                    />
                  </View>
                </View>
              </View>

              {/* Email Field */}
              <View className="mb-4">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                  Email
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm shadow-slate-200/50">
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

              {/* Phone Number Field */}
              <View className="mb-4">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                  Phone Number
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm shadow-slate-200/50">
                  <Ionicons name="call-outline" size={20} color="#94a3b8" />
                  <TextInput
                    placeholder="Enter your phone number"
                    placeholderTextColor="#94a3b8"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    className="flex-1 text-[#0f172a] ml-3 text-sm font-poppins"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="mb-4">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                  Password
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm shadow-slate-200/50">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#94a3b8"
                  />
                  <TextInput
                    placeholder="Create a password"
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

              {/* Confirm Password Field */}
              <View className="mb-6">
                <Text className="text-[#1e293b] text-sm font-poppins-semibold mb-2">
                  Confirm Password
                </Text>
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm shadow-slate-200/50">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#94a3b8"
                  />
                  <TextInput
                    placeholder="Confirm your password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 text-[#0f172a] ml-3 text-sm font-poppins"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={handleSignUp}
                className="bg-[#4d6029] active:opacity-90 py-4 rounded-2xl items-center justify-center shadow-md shadow-[#4d6029]/30 mb-6"
                activeOpacity={0.85}
              >
                <Text className="text-white font-poppins-bold text-base">
                  Sign Up
                </Text>
              </TouchableOpacity>

              {/* Already have an account? Sign In Link */}
              <View className="flex-row items-center justify-center mb-2">
                <Text className="text-[#64748b] text-sm font-poppins">
                  Already have an account?{" "}
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
