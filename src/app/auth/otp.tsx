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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authService } from "@/services/auth";
import { authState } from "@/services/auth-state";

export default function OtpVerificationScreen() {
  const userEmail = authState.getEmail();
  const mode = authState.getMode();

  const [code, setCode] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [resendTimer, setResendTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const inputRef = useRef<TextInput | null>(null);
  const isResendActive = resendTimer === 0;
  const isWeb = Platform.OS === "web";

  // Auto focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
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

  const handleCodeChange = (text: string) => {
    setErrorMessage(null);
    const clean = text.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(clean);

    // Auto verify as soon as 6 digits are reached
    if (clean.length === 6) {
      setTimeout(() => {
        verifyCode(clean);
      }, 100);
    }
  };

  const handleResendCode = async () => {
    if (!isResendActive) return;

    setCode("");
    setResendTimer(60);
    setErrorMessage(null);
    inputRef.current?.focus();

    try {
      const res = await authService.resendOtp(userEmail, mode);
      if (res.success) {
        setSuccessToast("A new 6-digit code has been sent.");
        setTimeout(() => setSuccessToast(null), 3500);

        if (!isWeb) {
          Alert.alert(
            "Code Resent",
            `A new 6-digit verification code has been sent to ${userEmail}.`
          );
        }
      } else {
        setErrorMessage(res.message || res.error || "Failed to resend code.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not connect to server.");
    }
  };

  const verifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length < 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await authService.verifyOtp(userEmail, codeToVerify, mode);

      if (!res.success) {
        setErrorMessage(res.message || res.error || "Invalid verification code.");
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);

      if (mode === "reset") {
        router.replace("/auth/reset-password");
      } else {
        const userRole = res.user?.role?.toLowerCase();
        if (userRole === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/user/dashboard");
        }
      }
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err.message || "An unexpected error occurred.");
    }
  };

  const handleVerifyButton = () => {
    verifyCode(code);
  };

  const handleFillDemoCode = () => {
    setCode("123456");
    setErrorMessage(null);
    setTimeout(() => {
      verifyCode("123456");
    }, 100);
  };

  const handleGoBack = () => {
    router.replace("/auth/sign-in");
  };

  const isComplete = code.length === 6;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Floating Toast Notification */}
        {successToast && (
          <View style={styles.toastContainer}>
            <View style={styles.toastContent}>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.toastText}>{successToast}</Text>
            </View>
            <TouchableOpacity onPress={() => setSuccessToast(null)}>
              <Ionicons name="close" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrapper}>
            {/* Header Hero Section */}
            <View style={styles.headerSection}>
              {/* Modern Layered Icon Badge */}
              <View style={styles.iconBadgeOuter}>
                <View style={styles.iconBadgeRing}>
                  <View style={styles.iconBadgeInner}>
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
                <View style={styles.badgeSmall}>
                  <View style={styles.badgeSmallInner}>
                    <Ionicons name="checkmark" size={12} color="#2d3416" />
                  </View>
                </View>
              </View>

              {/* Main Titles */}
              <Text style={styles.titleText}>
                {mode === "reset" ? "Reset Password" : "Verify Your Email"}
              </Text>

              <Text style={styles.subtitleText}>
                Enter the 6-digit verification code sent to
              </Text>

              {/* Email Address Pill Badge */}
              <View style={styles.emailPill}>
                <Ionicons name="mail" size={13} color="#4d6029" />
                <Text style={styles.emailPillText}>{userEmail}</Text>
              </View>
            </View>

            {/* 6-Digit OTP Section */}
            <View style={styles.otpSection}>
              <View style={styles.otpLabelRow}>
                <Text style={styles.otpLabel}>Verification Code</Text>
                {/* Quick test code auto-filler button */}
                <TouchableOpacity
                  onPress={handleFillDemoCode}
                  activeOpacity={0.7}
                  style={styles.autoFillBtn}
                >
                  <Feather name="zap" size={11} color="#64748b" />
                  <Text style={styles.autoFillText}>Auto-fill: 123456</Text>
                </TouchableOpacity>
              </View>

              {/* Seamless Tap Area for OTP Boxes */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => inputRef.current?.focus()}
                style={styles.otpBoxesRow}
              >
                {Array.from({ length: 6 }).map((_, idx) => {
                  const digit = code[idx] || "";
                  const isFilled = !!digit;
                  const isCurrent =
                    isInputFocused &&
                    (idx === code.length || (idx === 5 && code.length === 6));

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.otpBox,
                        isFilled && styles.otpBoxFilled,
                        isCurrent && styles.otpBoxFocused,
                      ]}
                    >
                      <Text
                        style={[
                          styles.otpDigitText,
                          isFilled && styles.otpDigitTextFilled,
                          !isFilled && !isCurrent && styles.otpPlaceholderText,
                        ]}
                      >
                        {digit ? digit : isCurrent ? "" : "•"}
                      </Text>
                      {isCurrent && !digit && <View style={styles.cursorBar} />}
                    </View>
                  );
                })}
              </TouchableOpacity>

              {/* Single Native Underlying TextInput */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                maxLength={6}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                style={styles.hiddenInput}
                caretHidden
              />

              {/* Error Message Feedback */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#e11d48" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}
            </View>

            {/* Resend Countdown Action */}
            <View style={styles.resendSection}>
              {isResendActive ? (
                <View style={styles.resendRow}>
                  <Text style={styles.resendPrompt}>
                    Didn&apos;t receive code?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendCode}
                    activeOpacity={0.7}
                    style={styles.resendButton}
                  >
                    <Ionicons name="refresh" size={13} color="#4d6029" />
                    <Text style={styles.resendButtonText}>Resend Code</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.timerPill}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.timerText}>
                    Resend code in{" "}
                    <Text style={styles.timerHighlight}>
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
              style={[
                styles.verifyButton,
                isComplete ? styles.verifyButtonActive : styles.verifyButtonInactive,
                isVerifying && styles.verifyButtonDisabled,
              ]}
            >
              {isVerifying ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
              ) : (
                <Ionicons
                  name="shield-checkmark"
                  size={19}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
              )}
              <Text style={styles.verifyButtonText}>
                {isVerifying ? "Verifying Code..." : "Verify & Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f3f6",
  },
  keyboardContainer: {
    flex: 1,
  },
  topNav: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  toastContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: "#4d6029",
    borderWidth: 1,
    borderColor: "#3e4e20",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    zIndex: 50,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  toastText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
    marginLeft: 8,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconBadgeOuter: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconBadgeRing: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(174, 172, 120, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(174, 172, 120, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#4d6029",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  badgeSmall: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#ffffff",
    padding: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  badgeSmallInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#AEAC78",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitleText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  emailPill: {
    backgroundColor: "rgba(174, 172, 120, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(174, 172, 120, 0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  emailPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2d3416",
    marginLeft: 8,
  },
  otpSection: {
    width: "100%",
    marginBottom: 20,
    position: "relative",
  },
  otpLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  otpLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  autoFillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  autoFillText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
    marginLeft: 4,
  },
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  otpBoxFilled: {
    borderColor: "#AEAC78",
    backgroundColor: "rgba(174, 172, 120, 0.18)",
  },
  otpBoxFocused: {
    borderColor: "#4d6029",
    backgroundColor: "#ffffff",
    elevation: 2,
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  otpDigitTextFilled: {
    color: "#0f172a",
  },
  otpPlaceholderText: {
    color: "#cbd5e1",
    fontSize: 20,
  },
  cursorBar: {
    width: 2,
    height: 24,
    backgroundColor: "#4d6029",
    borderRadius: 1,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0.01,
    left: -100,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#e11d48",
    marginLeft: 6,
  },
  resendSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 4,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendPrompt: {
    fontSize: 12,
    color: "#64748b",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(174, 172, 120, 0.25)",
  },
  resendButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4d6029",
    marginLeft: 4,
  },
  timerPill: {
    backgroundColor: "rgba(241, 245, 249, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.7)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 6,
  },
  timerHighlight: {
    fontWeight: "700",
    color: "#4d6029",
  },
  verifyButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 16,
    elevation: 3,
  },
  verifyButtonActive: {
    backgroundColor: "#4d6029",
  },
  verifyButtonInactive: {
    backgroundColor: "rgba(77, 96, 41, 0.8)",
  },
  verifyButtonDisabled: {
    opacity: 0.8,
  },
  verifyButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
