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

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isWeb = Platform.OS === "web";

  const showAlert = (title: string, message: string) => {
    setErrorMsg(message);
    if (isWeb) {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSignUp = async () => {
    setErrorMsg(null);
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/[\s-]/g, "");

    // 1. Name validation
    if (!cleanFirstName) {
      showAlert("Missing First Name", "Please enter your first name.");
      return;
    }
    if (cleanFirstName.length < 2) {
      showAlert("Invalid Name", "First name must be at least 2 characters long.");
      return;
    }
    if (!cleanLastName) {
      showAlert("Missing Last Name", "Please enter your last name.");
      return;
    }
    if (cleanLastName.length < 2) {
      showAlert("Invalid Name", "Last name must be at least 2 characters long.");
      return;
    }

    // 2. Email validation
    if (!cleanEmail) {
      showAlert("Missing Email", "Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showAlert("Invalid Email", "Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    // 3. Phone validation
    if (!cleanPhone) {
      showAlert("Missing Phone Number", "Please enter your contact phone number.");
      return;
    }
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      showAlert("Invalid Phone Number", "Please enter a valid mobile number (e.g. 09171234567).");
      return;
    }

    // 4. Password validation
    if (!password) {
      showAlert("Missing Password", "Please create a password for your account.");
      return;
    }
    if (password.length < 6) {
      showAlert("Weak Password", "Password must be at least 6 characters long.");
      return;
    }

    // 5. Password confirmation match
    if (password !== confirmPassword) {
      showAlert("Password Mismatch", "Passwords do not match. Please verify.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.register({
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
      });

      if (!res.success) {
        showAlert("Registration Failed", res.message || res.error || "Could not complete registration.");
        return;
      }

      if (isWeb) {
        window.alert(`Account Created! A 6-digit verification code has been sent to ${cleanEmail}.`);
        authState.setAuthTarget(cleanEmail, "verification");
        router.push("/auth/otp");
      } else {
        Alert.alert(
          "Account Created",
          `Welcome ${cleanFirstName}! A 6-digit verification code has been sent to ${cleanEmail}.`,
          [
            {
              text: "Enter OTP",
              onPress: () => {
                authState.setAuthTarget(cleanEmail, "verification");
                router.push("/auth/otp");
              },
            },
          ],
        );
      }
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
              {/* Error Banner */}
              {errorMsg && (
                <View className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex-row items-center">
                  <Ionicons name="alert-circle" size={18} color="#e11d48" />
                  <Text className="text-xs font-poppins-medium text-rose-700 ml-2 flex-1">
                    {errorMsg}
                  </Text>
                </View>
              )}

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
                      Creating Account...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white font-poppins-bold text-base">
                    Sign Up
                  </Text>
                )}
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
