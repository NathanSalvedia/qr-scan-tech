import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { formatToE164, sendFirebasePhoneOtp } from "@/services/phone-auth";
import {
  FirebaseRecaptchaModal,
  FirebaseRecaptchaRef,
} from "@/components/firebase-recaptcha-modal";

// Feature flag: Set to true whenever you want to switch to Firebase SMS OTP in the future
const USE_SMS_OTP = false;

export default function SignUpScreen() {
  const recaptchaRef = useRef<FirebaseRecaptchaRef>(null);
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    firstName: string;
    target: string;
    type: "email" | "sms";
  }>({ firstName: "", target: "", type: "email" });

  const handleProceedToOtp = () => {
    setShowSuccessModal(false);
    router.push("/auth/otp");
  };

  const handlePhoneChange = (text: string) => {
    // Keep only numeric characters up to 11 digits
    const digitsOnly = text.replace(/\D/g, "");
    if (digitsOnly.length <= 11) {
      setPhone(digitsOnly);
    }
  };

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
    if (phoneDigits.startsWith("09") && phoneDigits.length !== 11) {
      showAlert(
        "Invalid Phone Number",
        `Philippine mobile numbers must be exactly 11 digits (e.g. 09171234567). You entered ${phoneDigits.length} digits.`
      );
      return;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      showAlert("Invalid Phone Number", "Please enter a valid mobile number (e.g. 09171234567).");
      return;
    }

    // 4. Password validation (8 to 12 characters)
    if (!password) {
      showAlert("Missing Password", "Please create a password for your account.");
      return;
    }
    if (password.length < 8) {
      showAlert("Password Too Short", "Password must be at least 8 characters long.");
      return;
    }
    if (password.length > 12) {
      showAlert("Password Too Long", "Password cannot exceed 12 characters.");
      return;
    }

    // 5. Password confirmation match
    if (password !== confirmPassword) {
      showAlert("Password Mismatch", "Passwords do not match. Please verify.");
      return;
    }

    try {
      setIsLoading(true);

      // Pre-check availability for both email and phone to prevent duplicate registrations
      const checkRes = await authService.checkAvailability(cleanEmail, cleanPhone);
      if (!checkRes.success) {
        showAlert(
          checkRes.field === "phone" ? "Duplicate Phone Number" : "Account Exists",
          checkRes.message || "An account with this email or phone number already exists."
        );
        return;
      }

      if (USE_SMS_OTP) {
        // --- SMS OTP Flow (Preserved for future use) ---

        const formattedPhone = formatToE164(cleanPhone);
        const appVerifier = Platform.OS === "web" ? undefined : {
          type: "recaptcha",
          verify: async () => {
            if (recaptchaRef.current) {
              return await recaptchaRef.current.verify();
            }
            return "native-token";
          },
          _reset: () => {},
          render: async () => "0",
          clear: () => {},
        };

        const confirmationResult = await sendFirebasePhoneOtp(formattedPhone, appVerifier as any);

        authState.setPendingRegistration(
          {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            email: cleanEmail,
            phone: formattedPhone,
            password,
          },
          confirmationResult
        );

        setSuccessInfo({
          firstName: cleanFirstName,
          target: formattedPhone,
          type: "sms",
        });
        setShowSuccessModal(true);
      } else {
        // --- Email OTP Flow (Active) ---
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

        authState.setAuthTarget(cleanEmail, "verification", cleanPhone, "email");

        setSuccessInfo({
          firstName: cleanFirstName,
          target: cleanEmail,
          type: "email",
        });
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      console.error("Firebase Phone Auth error:", err);
      let message = err.message || "Failed to send SMS verification code.";
      if (err.code === "auth/invalid-phone-number") {
        message = "Invalid phone number format. Please check your mobile number (e.g. 09171234567).";
      } else if (err.code === "auth/quota-exceeded") {
        message = "Daily SMS quota has been reached. Please try again later or use a Firebase test number.";
      } else if (err.code === "auth/billing-not-enabled") {
        message = "Live SMS requires a billing account in Firebase. Add your number under 'Phone numbers for testing' in Firebase Console for free instant testing, or upgrade to Blaze.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many attempts. Please wait a few moments before trying again.";
      } else if (err.code === "auth/captcha-check-failed") {
        message = "Security verification failed. Please try again.";
      }
      showAlert("SMS Verification Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style={showSuccessModal ? "light" : "dark"} />
      <FirebaseRecaptchaModal ref={recaptchaRef} />
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
                <Image
                  source={require("@/assets/images/app-logo-white.png")}
                  style={{ width: 36, height: 36 }}
                  resizeMode="contain"
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
                <View
                  className={`flex-row items-center bg-white rounded-2xl px-4 py-2.5 border shadow-sm shadow-slate-200/50 ${
                    phone.length === 11 && phone.startsWith("09")
                      ? "border-[#4d6029]/60"
                      : "border-slate-100"
                  }`}
                >
                  <View className="flex-row items-center pr-2.5 mr-2 border-r border-slate-200">
                    <Ionicons name="call-outline" size={18} color="#4d6029" />
                    <Text className="text-xs font-poppins-bold text-[#0f172a] ml-1.5">
                      PH
                    </Text>
                  </View>
                  <TextInput
                    placeholder="0917 123 4567"
                    placeholderTextColor="#94a3b8"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={11}
                    className="flex-1 text-[#0f172a] text-sm font-poppins"
                  />
                  {phone.length === 11 && phone.startsWith("09") ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4d6029"
                    />
                  ) : null}
                </View>
                <Text className="text-[10px] font-poppins text-[#94a3b8] mt-1 ml-1">
                  Unique mobile number required (e.g. 09171234567)
                </Text>
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
                    placeholder="Create a password (8-12 chars)"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    maxLength={12}
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
                <Text className="text-[10px] font-poppins text-[#94a3b8] mt-1 ml-1">
                  Must be 8 to 12 characters
                </Text>
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
                    maxLength={12}
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

      {/* Customize Account Created / Verification Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
        >
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 items-center shadow-2xl border border-slate-100">
            {/* Top Close Button */}
            <View className="w-full items-end -mb-2">
              <TouchableOpacity
                onPress={() => setShowSuccessModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Success Icon */}
            <View className="w-16 h-16 rounded-3xl bg-[#4d6029]/10 items-center justify-center mb-4">
              <MaterialCommunityIcons
                name="account-check-outline"
                size={34}
                color="#4d6029"
              />
            </View>

            {/* Modal Title */}
            <Text className="text-xl font-poppins-bold text-[#0f172a] text-center mb-1.5">
              Account Created
            </Text>

            {/* Subtitle */}
            <Text className="text-xs font-poppins text-[#64748b] text-center mb-3 leading-relaxed px-2">
              Welcome {successInfo.firstName}! A 6-digit verification code has been sent to your{" "}
              {successInfo.type === "sms" ? "phone" : "email"}:
            </Text>

            {/* Highlight Box */}
            <View className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-3.5 flex-row items-center justify-center">
              <Ionicons
                name={successInfo.type === "sms" ? "phone-portrait-outline" : "mail"}
                size={16}
                color="#4d6029"
              />
              <Text
                className="text-xs font-poppins-bold text-[#0f172a] ml-2 shrink"
                numberOfLines={1}
              >
                {successInfo.target}
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
                {successInfo.type === "sms"
                  ? "Please check your SMS messages. The code expires in 10 minutes."
                  : "Please check your inbox and spam folder. The code expires in 10 minutes."}
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
                Enter OTP
              </Text>
            </TouchableOpacity>

            {/* Secondary Action / Close */}
            <TouchableOpacity
              onPress={() => setShowSuccessModal(false)}
              className="py-2 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-xs font-poppins-semibold text-[#64748b]">
                Review Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
