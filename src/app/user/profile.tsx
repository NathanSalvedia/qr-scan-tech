import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  const router = useRouter();

  // Technician Status
  const [isOnDuty, setIsOnDuty] = useState(true);

  // Scanner Preferences
  const [vibrateOnScan, setVibrateOnScan] = useState(true);
  const [autoFlashlight, setAutoFlashlight] = useState(false);
  const [beepOnScan, setBeepOnScan] = useState(true);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Today, 10:45 AM");
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSyncData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      const timeStr = `Today, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      setLastSyncTime(timeStr);
      setSyncToast("Box records successfully synced offline!");
      setTimeout(() => setSyncToast(null), 3000);
    }, 1200);
  };

  const handleSavePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Incomplete Form", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Password Length", "Password must be at least 6 characters.");
      return;
    }

    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("Success", "Your password has been successfully updated.");
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    router.replace("/auth/sign-in" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      {/* Main Container */}
      <View className="flex-1 px-4 pt-3 max-w-[600px] w-full self-center">
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-[11px] font-poppins-semibold tracking-wider text-[#64748b] uppercase">
              MultiFactors Sales
            </Text>
            <Text className="text-2xl font-poppins-bold text-[#0f172a] mt-0.5">
              Menu & Settings
            </Text>
          </View>
          <View className="w-10 h-10 rounded-2xl bg-[#4d6029]/10 items-center justify-center border border-[#4d6029]/20">
            <Ionicons name="settings-outline" size={22} color="#4d6029" />
          </View>
        </View>

        {/* Sync Toast Notification */}
        {syncToast && (
          <View className="bg-emerald-600 rounded-xl py-2.5 px-4 mb-3 flex-row items-center justify-between shadow-sm">
            <View className="flex-row items-center flex-1 mr-2">
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text className="text-xs font-poppins-semibold text-white ml-2">
                {syncToast}
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Technician Profile Card */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-200/80 shadow-sm shadow-slate-200/40">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-12 h-12 rounded-2xl bg-[#4d6029] items-center justify-center mr-3 shadow-sm shadow-[#4d6029]/20">
                  <Text className="text-lg font-poppins-bold text-white">
                    NS
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-poppins-bold text-[#0f172a]">
                    Nathan Salvedia
                  </Text>
                  <Text className="text-xs font-poppins-medium text-[#64748b] mt-0.5">
                    nathansalvedia2002@gmail.com
                  </Text>
                  <Text className="text-[11px] font-poppins-semibold text-[#4d6029] mt-0.5">
                    Field Technician
                  </Text>
                </View>
              </View>

              {/* On Duty Status Badge Toggle */}
              <TouchableOpacity
                onPress={() => setIsOnDuty(!isOnDuty)}
                activeOpacity={0.8}
                className={`flex-row items-center px-2.5 py-1.5 rounded-full border ${
                  isOnDuty
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-slate-100 border-slate-300"
                }`}
              >
                <View
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isOnDuty ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <Text
                  className={`text-[10px] font-poppins-semibold ${
                    isOnDuty ? "text-emerald-700" : "text-slate-600"
                  }`}
                >
                  {isOnDuty ? "On Duty" : "Off Duty"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 1: Scanner Preferences */}
          <View className="mb-4">
            <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase mb-2 ml-1">
              Scanner Preferences
            </Text>

            <View className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/40 overflow-hidden">
              {/* Vibrate on Scan */}
              <View className="p-4 flex-row items-center justify-between border-b border-slate-100">
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="vibrate"
                      size={18}
                      color="#475569"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Vibrate on QR Scan
                    </Text>
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5">
                      Haptic pulse upon successful detection
                    </Text>
                  </View>
                </View>
                <Switch
                  value={vibrateOnScan}
                  onValueChange={setVibrateOnScan}
                  trackColor={{ false: "#cbd5e1", true: "#4d6029" }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Auto Flashlight in Dark */}
              <View className="p-4 flex-row items-center justify-between border-b border-slate-100">
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-3">
                    <Ionicons
                      name="flashlight-outline"
                      size={18}
                      color="#475569"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Auto Flashlight in Dark
                    </Text>
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5">
                      Enable torch automatically in dark enclosures
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoFlashlight}
                  onValueChange={setAutoFlashlight}
                  trackColor={{ false: "#cbd5e1", true: "#4d6029" }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Beep Sound on Scan */}
              <View className="p-4 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-3">
                    <Ionicons
                      name="volume-medium-outline"
                      size={18}
                      color="#475569"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Beep Sound on Scan
                    </Text>
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5">
                      Play confirmation audio tone
                    </Text>
                  </View>
                </View>
                <Switch
                  value={beepOnScan}
                  onValueChange={setBeepOnScan}
                  trackColor={{ false: "#cbd5e1", true: "#4d6029" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>

          {/* Section 2: System & Account */}
          <View className="mb-4">
            <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase mb-2 ml-1">
              System & Account
            </Text>

            <View className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/40 overflow-hidden">
              {/* Sync Box Data Offline */}
              <View className="p-4 flex-row items-center justify-between border-b border-slate-100">
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-3">
                    <Ionicons name="sync-outline" size={18} color="#4d6029" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Sync Box Data Offline
                    </Text>
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5">
                      Last updated: {lastSyncTime}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSyncData}
                  disabled={isSyncing}
                  className="bg-[#4d6029]/10 px-3 py-1.5 rounded-lg border border-[#4d6029]/20 flex-row items-center active:bg-[#4d6029]/20"
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={13}
                    color="#4d6029"
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-xs font-poppins-semibold text-[#4d6029]">
                    {isSyncing ? "Syncing..." : "Sync"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Change Password */}
              <TouchableOpacity
                onPress={() => setShowPasswordModal(true)}
                className="p-4 flex-row items-center justify-between border-b border-slate-100 active:bg-slate-50"
                activeOpacity={0.75}
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-3">
                    <Ionicons name="key-outline" size={18} color="#475569" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Change Password
                    </Text>
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5">
                      Update your login security credentials
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* Sign Out */}
              <TouchableOpacity
                onPress={() => setShowLogoutModal(true)}
                className="p-4 flex-row items-center justify-between active:bg-rose-50/50"
                activeOpacity={0.75}
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center mr-3 border border-rose-100">
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color="#e11d48"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-[#e11d48]">
                      Sign Out
                    </Text>
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5">
                      Log out of field technician session
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#f43f5e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Metadata */}
          <View className="items-center justify-center pt-3">
            <Text className="text-[10px] font-poppins-semibold text-[#94a3b8]">
              MultiFactors Network Infrastructure
            </Text>
            <Text className="text-[9px] font-poppins-medium text-[#cbd5e1] mt-0.5">
              QR Box Management · Version 1.2.0
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center px-5">
          <View className="bg-white rounded-3xl p-6 max-w-md w-full self-center shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <Ionicons name="key-outline" size={18} color="#4d6029" />
                </View>
                <Text className="text-base font-poppins-bold text-[#0f172a]">
                  Change Password
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View className="mb-3">
              <Text className="text-xs font-poppins-semibold text-[#334155] mb-1.5">
                Current Password
              </Text>
              <TextInput
                secureTextEntry={!showPasswords}
                placeholder="Enter current password"
                placeholderTextColor="#94a3b8"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                className="bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-poppins-medium text-[#0f172a] border border-slate-200"
              />
            </View>

            <View className="mb-3">
              <Text className="text-xs font-poppins-semibold text-[#334155] mb-1.5">
                New Password
              </Text>
              <TextInput
                secureTextEntry={!showPasswords}
                placeholder="Enter new password (min. 6 chars)"
                placeholderTextColor="#94a3b8"
                value={newPassword}
                onChangeText={setNewPassword}
                className="bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-poppins-medium text-[#0f172a] border border-slate-200"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-poppins-semibold text-[#334155] mb-1.5">
                Confirm New Password
              </Text>
              <TextInput
                secureTextEntry={!showPasswords}
                placeholder="Re-enter new password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-poppins-medium text-[#0f172a] border border-slate-200"
              />
            </View>

            {/* Show Password Toggle */}
            <TouchableOpacity
              onPress={() => setShowPasswords(!showPasswords)}
              className="flex-row items-center mb-5"
              activeOpacity={0.8}
            >
              <Ionicons
                name={showPasswords ? "checkbox" : "square-outline"}
                size={18}
                color={showPasswords ? "#4d6029" : "#94a3b8"}
              />
              <Text className="text-xs font-poppins-medium text-[#64748b] ml-2">
                Show Passwords
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="flex-1 bg-slate-100 py-3 rounded-xl items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-xs font-poppins-semibold text-[#64748b]">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSavePassword}
                className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center shadow-sm"
                activeOpacity={0.88}
              >
                <Text className="text-xs font-poppins-bold text-white">
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center px-5">
          <View className="bg-white rounded-3xl p-6 max-w-sm w-full self-center items-center shadow-2xl">
            <View className="w-14 h-14 rounded-2xl bg-rose-50 items-center justify-center mb-3 border border-rose-100">
              <Ionicons name="log-out-outline" size={28} color="#e11d48" />
            </View>

            <Text className="text-base font-poppins-bold text-[#0f172a] text-center">
              Sign Out of Field Ops?
            </Text>
            <Text className="text-xs font-poppins-regular text-[#64748b] text-center mt-1 mb-5">
              Are you sure you want to end your current session? You will need
              to log in again.
            </Text>

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                className="flex-1 bg-slate-100 py-3 rounded-xl items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-xs font-poppins-semibold text-[#64748b]">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmLogout}
                className="flex-1 bg-rose-600 py-3 rounded-xl items-center justify-center shadow-sm"
                activeOpacity={0.88}
              >
                <Text className="text-xs font-poppins-bold text-white">
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Steady Bottom Navigation Bar */}
      <UserBottomNavigation activeRoute="/user/profile" />
    </SafeAreaView>
  );
}
