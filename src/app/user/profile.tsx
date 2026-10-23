import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { authService } from "@/services/auth";
import { useAuth } from "@/services/auth-state";
import { boxService } from "@/services/boxes";
import { BeepSoundStyle, settingsService } from "@/services/settings";
import { BEEP_SOUND_OPTIONS } from "@/services/sound";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Dynamic Technician Profile Details
  const initials = useMemo(() => {
    const first = user?.firstName?.[0] || "";
    const last = user?.lastName?.[0] || "";
    if (first || last) return (first + last).toUpperCase();
    if (user?.name) {
      const parts = user.name.trim().split(" ");
      return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
    }
    return "TU";
  }, [user]);

  const fullName = useMemo(() => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    if (user?.name) return user.name;
    return "User";
  }, [user]);

  const email = useMemo(() => {
    return user?.email || "user@multifactors.com";
  }, [user]);

  const roleLabel = useMemo(() => {
    return user?.role?.toLowerCase() === "admin"
      ? "Network Administrator"
      : "Users";
  }, [user]);

  // Technician On-Duty Status (Persisted in AsyncStorage)
  const [isOnDuty, setIsOnDuty] = useState(true);

  // Scanner Preferences (Persisted in AsyncStorage)
  const [vibrateOnScan, setVibrateOnScan] = useState(true);
  const [autoFlashlight, setAutoFlashlight] = useState(false);
  const [beepOnScan, setBeepOnScan] = useState(true);
  const [beepSoundStyle, setBeepSoundStyle] =
    useState<BeepSoundStyle>("tech-chirp");

  const currentSoundOption = useMemo(() => {
    return (
      BEEP_SOUND_OPTIONS.find((s) => s.id === beepSoundStyle) ||
      BEEP_SOUND_OPTIONS[0]
    );
  }, [beepSoundStyle]);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Loading...");
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Load and refresh persisted settings on mount and screen focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        try {
          const [prefs, duty, syncTs] = await Promise.all([
            settingsService.getScannerPreferences(),
            settingsService.getOnDutyStatus(),
            settingsService.getLastSyncTimestamp(),
          ]);
          if (!isMounted) return;
          setVibrateOnScan(prefs.vibrateOnScan);
          setAutoFlashlight(prefs.autoFlashlight);
          setBeepOnScan(prefs.beepOnScan);
          if (prefs.beepSoundStyle) {
            setBeepSoundStyle(prefs.beepSoundStyle);
          }
          setIsOnDuty(duty);
          setLastSyncTime(settingsService.formatLastSyncTime(syncTs));
        } catch (e) {
          console.error("Failed to load user settings:", e);
        }
      })();
      return () => {
        isMounted = false;
      };
    }, []),
  );

  // Handlers for Preferences
  const handleToggleDuty = async () => {
    const nextVal = !isOnDuty;
    setIsOnDuty(nextVal);
    await settingsService.setOnDutyStatus(nextVal);
  };

  const handleToggleVibrate = async (val: boolean) => {
    setVibrateOnScan(val);
    await settingsService.setScannerPreferences({ vibrateOnScan: val });
  };

  const handleToggleAutoFlash = async (val: boolean) => {
    setAutoFlashlight(val);
    await settingsService.setScannerPreferences({ autoFlashlight: val });
  };

  const handleToggleBeep = async (val: boolean) => {
    setBeepOnScan(val);
    await settingsService.setScannerPreferences({ beepOnScan: val });
  };

  // Dynamic Offline Sync
  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const res = await boxService.getAll();
      if (res.success && Array.isArray(res.boxes)) {
        await settingsService.saveOfflineBoxes(res.boxes);
        const nowIso = new Date().toISOString();
        setLastSyncTime(settingsService.formatLastSyncTime(nowIso));
        setSyncToast(
          `Successfully synced ${res.boxes.length} box records for offline use!`,
        );
      } else {
        setSyncToast("Sync failed: Could not load distribution boxes.");
      }
    } catch (e: any) {
      console.error("Sync offline data error:", e);
      setSyncToast("Sync failed: Server connection unavailable.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 3800);
    }
  };

  // Sign Out Handler
  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await authService.logout(user);
    logout();
    router.replace("/auth/sign-in" as any);
  };

  const appVersion = Constants.expoConfig?.version || "1.2.0";

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
                    {initials}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-poppins-bold text-[#0f172a]">
                    {fullName}
                  </Text>
                  <Text className="text-xs font-poppins-medium text-[#64748b] mt-0.5">
                    {email}
                  </Text>
                  <Text className="text-[11px] font-poppins-semibold text-[#4d6029] mt-0.5">
                    {roleLabel}
                  </Text>
                </View>
              </View>

              {/* On Duty Status Badge Toggle */}
              <TouchableOpacity
                onPress={handleToggleDuty}
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
                  onValueChange={handleToggleVibrate}
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
                  onValueChange={handleToggleAutoFlash}
                  trackColor={{ false: "#cbd5e1", true: "#4d6029" }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Beep Sound on Scan */}
              <View className="p-4 flex-row items-center justify-between border-b border-slate-100">
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
                  onValueChange={handleToggleBeep}
                  trackColor={{ false: "#cbd5e1", true: "#4d6029" }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Beep Sound Tone Selector Page Navigation */}
              <TouchableOpacity
                onPress={() => router.push("/user/scan-sound" as any)}
                activeOpacity={0.7}
                className="px-4 py-3 bg-slate-50/70 flex-row items-center justify-between active:bg-slate-100"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-3 border border-[#4d6029]/20">
                    <Ionicons name="musical-note" size={16} color="#4d6029" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Beep Sound Tone
                    </Text>
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5">
                      Current:{" "}
                      <Text className="font-poppins-bold text-[#4d6029]">
                        {currentSoundOption.name}
                      </Text>
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-[10px] font-poppins-semibold text-[#4d6029] mr-1">
                    Change
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#4d6029" />
                </View>
              </TouchableOpacity>
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
                  {isSyncing ? (
                    <ActivityIndicator
                      size="small"
                      color="#4d6029"
                      style={{ marginRight: 4 }}
                    />
                  ) : (
                    <Ionicons
                      name="refresh-outline"
                      size={13}
                      color="#4d6029"
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text className="text-xs font-poppins-semibold text-[#4d6029]">
                    {isSyncing ? "Syncing..." : "Sync"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Change Password */}
              <TouchableOpacity
                onPress={() => router.push("/user/change-password" as any)}
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
                      Log out of user session
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#f43f5e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Metadata */}
          <View className="items-center justify-center pt-3">
            <Text className="text-[9px] font-poppins-medium text-[#cbd5e1] mt-0.5">
              ScanOps· Version {appVersion}
            </Text>
          </View>
        </ScrollView>
      </View>

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
