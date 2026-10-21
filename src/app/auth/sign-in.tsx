import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
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
import {
  API_BASE_URL,
  getActiveApiBaseUrl,
  loadCustomApiUrl,
  normalizeApiUrl,
  setCustomApiUrl,
} from "@/services/api-config";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Server URL settings state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    loadCustomApiUrl().then((custom) => {
      setServerUrlInput(custom || API_BASE_URL);
    });
  }, []);

  const handleTestConnection = async () => {
    const urlToTest = normalizeApiUrl(serverUrlInput.trim() || API_BASE_URL);
    setServerUrlInput(urlToTest);
    setTestStatus("testing");
    setTestMessage("Testing connection...");
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${urlToTest}/auth/check-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
        body: JSON.stringify({ email: "healthcheck@test.com" }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 200 || res.status === 400) {
        setTestStatus("success");
        setTestMessage("Connected to server successfully!");
      } else {
        setTestStatus("error");
        setTestMessage(`Server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(err.message || "Failed to connect to host.");
    }
  };

  const handleSaveServerUrl = async () => {
    const clean = normalizeApiUrl(serverUrlInput.trim() || API_BASE_URL);
    setServerUrlInput(clean);
    await setCustomApiUrl(clean === API_BASE_URL ? null : clean);
    setShowServerModal(false);
    showAlert("Server Updated", `Active backend URL:\n${clean}`);
  };

  const handleResetServerUrl = async () => {
    await setCustomApiUrl(null);
    setServerUrlInput(API_BASE_URL);
    setTestStatus("idle");
    setTestMessage("");
    showAlert("Server Reset", `Reset to default:\n${API_BASE_URL}`);
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

  const handleSignIn = async () => {
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Email required
    if (!cleanEmail) {
      showAlert("Missing Email", "Please enter your email address to continue.");
      return;
    }

    // 2. Email format check (allows standard email format or 'admin' shorthand)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (cleanEmail !== "admin" && !emailRegex.test(cleanEmail)) {
      showAlert("Invalid Email", "Please enter a valid email address (e.g. user@domain.com).");
      return;
    }

    // 3. Password required
    if (!password) {
      showAlert("Missing Password", "Please enter your account password.");
      return;
    }

    // 4. Password minimum length
    if (password.length < 6) {
      showAlert("Invalid Password", "Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.login(cleanEmail, password);

      if (!res.success) {
        showAlert("Login Failed", res.message || res.error || "Invalid email or password.");
        return;
      }

      const userRole = res.user?.role?.toLowerCase();

      if (userRole === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/user/dashboard");
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

      {/* Top Header with Server Settings Button */}
      <View className="flex-row justify-end px-5 pt-1 pb-1">
        <TouchableOpacity
          onPress={() => {
            setServerUrlInput(getActiveApiBaseUrl());
            setTestStatus("idle");
            setTestMessage("");
            setShowServerModal(true);
          }}
          className="flex-row items-center px-3 py-1.5 bg-white border border-slate-200/80 rounded-full shadow-sm"
          activeOpacity={0.7}
        >
          <Ionicons name="server-outline" size={13} color="#475569" />
          <Text className="text-[11px] text-slate-700 font-poppins-medium ml-1.5">
            Server Settings
          </Text>
        </TouchableOpacity>
      </View>

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
              {/* Error Banner */}
              {errorMsg && (
                <View className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex-row items-center">
                  <Ionicons name="alert-circle" size={18} color="#e11d48" />
                  <Text className="text-xs font-poppins-medium text-rose-700 ml-2 flex-1">
                    {errorMsg}
                  </Text>
                </View>
              )}

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
                disabled={isLoading}
                className={`bg-[#4d6029] active:opacity-90 py-4 rounded-2xl items-center justify-center shadow-md mb-4 ${
                  isLoading ? "opacity-75" : ""
                }`}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text className="text-white font-poppins-bold text-base ml-2">
                      Signing In...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white font-poppins-bold text-base">
                    Sign In
                  </Text>
                )}
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

      {/* Backend Server Settings Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowServerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black/60 justify-center items-center px-5"
        >
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <Ionicons name="server" size={18} color="#4d6029" />
                </View>
                <Text className="text-base font-poppins-bold text-[#0f172a]">
                  Server Settings
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowServerModal(false)}
                className="p-1 rounded-full bg-slate-100"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-[#64748b] font-poppins mb-3.5 leading-relaxed">
              Configure backend API URL without rebuilding the app. Ideal for Vercel production, remote servers, or local Wi-Fi.
            </Text>

            <Text className="text-[#1e293b] text-xs font-poppins-semibold mb-1.5">
              Backend API Base URL:
            </Text>
            <TextInput
              placeholder="https://qr-scan-tech.vercel.app/api"
              placeholderTextColor="#94a3b8"
              value={serverUrlInput}
              onChangeText={(text) => {
                setServerUrlInput(text);
                setTestStatus("idle");
                setTestMessage("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0f172a] font-poppins mb-3"
            />

            {testStatus !== "idle" && (
              <View
                className={`p-2.5 rounded-xl mb-3 flex-row items-center ${
                  testStatus === "testing"
                    ? "bg-slate-100 border border-slate-200"
                    : testStatus === "success"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-rose-50 border border-rose-200"
                }`}
              >
                {testStatus === "testing" && (
                  <ActivityIndicator size="small" color="#4d6029" className="mr-2" />
                )}
                {testStatus === "success" && (
                  <Ionicons name="checkmark-circle" size={16} color="#059669" className="mr-2" />
                )}
                {testStatus === "error" && (
                  <Ionicons name="alert-circle" size={16} color="#e11d48" className="mr-2" />
                )}
                <Text
                  className={`text-xs font-poppins-medium flex-1 ${
                    testStatus === "testing"
                      ? "text-slate-600"
                      : testStatus === "success"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {testMessage}
                </Text>
              </View>
            )}

            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity
                onPress={handleTestConnection}
                disabled={testStatus === "testing"}
                className="flex-1 bg-slate-100 border border-slate-200 py-2.5 rounded-xl items-center"
              >
                <Text className="text-slate-700 font-poppins-semibold text-xs">
                  Test Connection
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResetServerUrl}
                className="bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-xl items-center"
              >
                <Text className="text-slate-600 font-poppins text-xs">Reset</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSaveServerUrl}
              className="w-full bg-[#4d6029] py-3 rounded-xl items-center shadow-sm"
              activeOpacity={0.85}
            >
              <Text className="text-white font-poppins-bold text-sm">
                Save & Apply
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
