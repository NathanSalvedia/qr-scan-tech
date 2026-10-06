import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
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

interface OtpVerificationScreenProps {
  route?: {
    params?: {
      email?: string;
      mode?: string;
    };
  };
  email?: string;
  mode?: string;
}

export default function OtpVerificationScreen({
  route,
  email: propEmail,
  mode: propMode,
}: OtpVerificationScreenProps = {}) {
  const userEmail =
    propEmail || route?.params?.email || "nathansalvedia2002@gmail.com";
  const mode = propMode || route?.params?.mode || "verification";

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [resendTimer, setResendTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const isResendActive = resendTimer === 0;
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const isWeb = Platform.OS === "web";

  // Auto focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    setErrorMessage(null);

    // Handle multiple digits pasted (e.g. from SMS auto-fill or clipboard)
    if (value.length > 1) {
      const digits = value
        .replace(/[^0-9]/g, "")
        .slice(0, 6)
        .split("");
      const newOtp = ["", "", "", "", "", ""];
      digits.forEach((digit, idx) => {
        if (idx < 6) newOtp[idx] = digit;
      });
      setOtp(newOtp);

      const nextFocus = Math.min(digits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      setFocusedIndex(nextFocus);

      // If full 6 digits were pasted, trigger verification
      if (digits.length === 6) {
        setTimeout(() => {
          verifyCode(newOtp.join(""));
        }, 200);
      }
      return;
    }

    const cleanDigit = value.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = cleanDigit;
    setOtp(newOtp);

    // Auto-advance focus
    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Auto-verify if all 6 digits are filled
    if (cleanDigit && index === 5) {
      const fullCode = newOtp.join("");
      if (fullCode.length === 6) {
        setTimeout(() => {
          verifyCode(fullCode);
        }, 150);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  const handleResendCode = () => {
    if (!isResendActive) return;

    setOtp(["", "", "", "", "", ""]);
    setResendTimer(60);
    setErrorMessage(null);
    inputRefs.current[0]?.focus();
    setFocusedIndex(0);

    setSuccessToast("A new 6-digit code has been sent.");
    setTimeout(() => setSuccessToast(null), 3500);

    if (isWeb) {
      // web toast handled
    } else {
      Alert.alert(
        "Code Resent",
        `A new 6-digit verification code has been sent to ${userEmail}.`,
      );
    }
  };

  const verifyCode = (codeToVerify: string) => {
    if (codeToVerify.length < 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsVerifying(false);
      const cleanEmail = userEmail.toLowerCase().trim();

      if (cleanEmail === "admin@multifactors.ph" || cleanEmail === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/user/dashboard");
      }
    }, 700);
  };

  const handleVerifyButton = () => {
    const fullCode = otp.join("");
    verifyCode(fullCode);
  };

  const handleFillDemoCode = () => {
    const demoCode = ["1", "2", "3", "4", "5", "6"];
    setOtp(demoCode);
    setErrorMessage(null);
    inputRefs.current[5]?.focus();
    setFocusedIndex(5);
  };

  const handleGoBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/auth/sign-in");
      }
    } catch {
      router.replace("/auth/sign-in");
    }
  };

  const isComplete = otp.every((digit) => digit.length === 1);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Top Navigation Bar */}
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleGoBack}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200/90 items-center justify-center shadow-xs active:bg-slate-100"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Floating Toast Notification */}
        {successToast && (
          <View className="mx-5 mt-2 bg-[#4d6029] border border-[#3e4e20] px-4 py-3 rounded-2xl flex-row items-center justify-between shadow-lg z-50">
            <View className="flex-row items-center flex-1 mr-2">
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text className="text-xs font-poppins-bold text-white ml-2 flex-1">
                {successToast}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSuccessToast(null)}>
              <Ionicons name="close" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-sm self-center">
            {/* Header Hero Section */}
            <View className="items-center mb-7">
              {/* Modern Layered Icon Badge */}
              <View className="relative items-center justify-center mb-4">
                <View className="w-20 h-20 rounded-3xl bg-[#AEAC78]/20 border border-[#AEAC78]/50 items-center justify-center">
                  <View className="w-14 h-14 rounded-2xl bg-[#4d6029] items-center justify-center shadow-md shadow-[#4d6029]/30">
                    <MaterialCommunityIcons
                      name={
                        mode === "reset" ? "lock-reset" : "email-check-outline"
                      }
                      size={28}
                      color="#ffffff"
                    />
                  </View>
                </View>
                {/* Small decorative security badge */}
                <View className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-xs border border-slate-100">
                  <View className="w-5 h-5 rounded-full bg-[#AEAC78] items-center justify-center">
                    <Ionicons name="checkmark" size={12} color="#2d3416" />
                  </View>
                </View>
              </View>

              {/* Main Titles */}
              <Text className="text-2xl font-poppins-bold text-[#0f172a] tracking-tight text-center">
                {mode === "reset" ? "Reset Password" : "Verify Your Email"}
              </Text>

              <Text className="text-[#64748b] text-xs sm:text-sm mt-1.5 font-poppins text-center leading-5 px-2">
                Enter the 6-digit verification code sent to
              </Text>

              {/* Email Address Pill Badge */}
              <View className="bg-[#AEAC78]/15 border border-[#AEAC78]/60 px-3.5 py-1.5 rounded-2xl mt-2.5 flex-row items-center">
                <Ionicons name="mail" size={13} color="#4d6029" />
                <Text className="text-xs font-poppins-semibold text-[#2d3416] ml-2">
                  {userEmail}
                </Text>
              </View>
            </View>

            {/* 6-Digit OTP Boxes */}
            <View className="w-full mb-5">
              <View className="flex-row items-center justify-between mb-3 px-1">
                <Text className="text-[#334155] text-xs font-poppins-semibold">
                  Verification Code
                </Text>
                {/* Quick test code auto-filler button */}
                <TouchableOpacity
                  onPress={handleFillDemoCode}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-slate-100 px-2 py-0.5 rounded-md"
                >
                  <Feather name="zap" size={11} color="#64748b" />
                  <Text className="text-[10px] font-poppins-medium text-[#64748b] ml-1">
                    Auto-fill: 123456
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between items-center gap-1.5 sm:gap-2.5">
                {otp.map((digit, idx) => {
                  const isFilled = !!digit;
                  const isFocused = focusedIndex === idx;

                  return (
                    <View
                      key={idx}
                      className={`flex-1 h-14 sm:h-16 rounded-2xl border-2 items-center justify-center transition-all ${
                        isFocused
                          ? "border-[#4d6029] bg-white shadow-sm shadow-[#4d6029]/25"
                          : isFilled
                            ? "border-[#AEAC78] bg-[#AEAC78]/15"
                            : "border-slate-300 bg-white"
                      }`}
                    >
                      <TextInput
                        ref={(ref) => {
                          inputRefs.current[idx] = ref;
                        }}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, idx)}
                        onKeyPress={(e) => handleKeyPress(e, idx)}
                        onFocus={() => setFocusedIndex(idx)}
                        onBlur={() =>
                          setFocusedIndex((prev) =>
                            prev === idx ? null : prev,
                          )
                        }
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        autoComplete="one-time-code"
                        maxLength={1}
                        selectTextOnFocus
                        textAlign="center"
                        className="w-full h-full text-center text-xl sm:text-2xl font-poppins-bold text-[#0f172a]"
                        placeholder={isFocused ? "" : "•"}
                        placeholderTextColor="#cbd5e1"
                      />
                    </View>
                  );
                })}
              </View>

              {/* Error Message Feedback */}
              {errorMessage && (
                <View className="flex-row items-center justify-center mt-3 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                  <Ionicons name="alert-circle" size={14} color="#e11d48" />
                  <Text className="text-xs font-poppins-medium text-rose-600 ml-1.5">
                    {errorMessage}
                  </Text>
                </View>
              )}
            </View>

            {/* Resend Countdown Action */}
            <View className="items-center mb-6 pt-1">
              {isResendActive ? (
                <View className="flex-row items-center">
                  <Text className="text-xs font-poppins text-[#64748b]">
                    Didn&apos;t receive code?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendCode}
                    activeOpacity={0.7}
                    className="flex-row items-center py-1 px-2 rounded-lg bg-[#AEAC78]/20"
                  >
                    <Ionicons name="refresh" size={13} color="#4d6029" />
                    <Text className="text-xs font-poppins-bold text-[#4d6029] ml-1">
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="bg-slate-100/90 border border-slate-200/70 px-3.5 py-1.5 rounded-xl flex-row items-center">
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text className="text-xs font-poppins text-[#64748b] ml-1.5">
                    Resend code in{" "}
                    <Text className="font-poppins-bold text-[#4d6029]">
                      00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleVerifyButton}
              disabled={isVerifying}
              activeOpacity={0.85}
              className={`py-4 rounded-2xl items-center justify-center shadow-md flex-row mb-4 ${
                isComplete
                  ? "bg-[#4d6029] shadow-[#4d6029]/30"
                  : "bg-[#4d6029]/80 shadow-slate-300/40"
              } ${isVerifying ? "opacity-80" : ""}`}
            >
              {isVerifying ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                  className="mr-2"
                />
              ) : (
                <Ionicons
                  name="shield-checkmark"
                  size={19}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
              )}
              <Text className="text-white font-poppins-bold text-base">
                {isVerifying ? "Verifying Code..." : "Verify & Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
