import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { useAuth } from "@/services/auth-state";
import { boxService } from "@/services/boxes";
import { logsService, type RecentScanItem } from "@/services/logs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getGreeting = (date: Date = new Date()): string => {
  const hour = date.getHours();
  if (hour >= 18) {
    return "Good evening";
  }

  if (hour >= 12) {
    return "Good afternoon";
  }

  return "Good morning";
};

const getScanBadge = (scan: RecentScanItem) => {
  if (scan.isAlarm || scan.boxStatus === "ISSUE") {
    return {
      label: scan.isAlarm ? "Alarm" : "Issue",
      icon: "alert-circle" as const,
      iconColor: "#e11d48",
      iconBg: "bg-rose-50 border-rose-100",
      pillBg: "bg-rose-100",
      pillText: "text-rose-800",
    };
  }
  if (scan.boxStatus === "NEEDS_TAG") {
    return {
      label: "Needs Tag",
      icon: "tag-outline" as const,
      iconColor: "#d97706",
      iconBg: "bg-amber-50 border-amber-100",
      pillBg: "bg-amber-100",
      pillText: "text-amber-800",
    };
  }
  return {
    label: "Operational",
    icon: "cube" as const,
    iconColor: "#4d6029",
    iconBg: "bg-emerald-50 border-emerald-100",
    pillBg: "bg-emerald-100",
    pillText: "text-emerald-800",
  };
};

export default function UserDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    tagged: 0,
    needsTag: 0,
    issues: 0,
  });
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [greeting, setGreeting] = useState<string>(getGreeting());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamically update greeting every 30 seconds and whenever app returns to active
  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreeting());
    };

    const interval = setInterval(updateGreeting, 30000);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        updateGreeting();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const fetchDashboard = useCallback(async () => {
    const [boxesRes, scansRes] = await Promise.all([
      boxService.getAll(),
      logsService.getMyRecentScans(5),
    ]);

    const boxes =
      boxesRes.success && boxesRes.boxes
        ? (boxesRes.boxes as { status: string }[])
        : null;

    return {
      stats: boxes
        ? {
            total: boxes.length,
            tagged: boxes.filter((b) => b.status === "ACTIVE").length,
            needsTag: boxes.filter((b) => b.status === "NEEDS_TAG").length,
            issues: boxes.filter((b) => b.status === "ISSUE").length,
          }
        : null,
      scans: scansRes.success && scansRes.scans ? scansRes.scans : null,
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetchDashboard();
        if (!isMounted) return;
        if (data.stats) setStats(data.stats);
        if (data.scans) setRecentScans(data.scans);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchDashboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setGreeting(getGreeting());
    try {
      const data = await fetchDashboard();
      if (data.stats) setStats(data.stats);
      if (data.scans) setRecentScans(data.scans);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboard]);

  const totalBoxes = stats.total;
  const taggedBoxes = stats.tagged;
  const needsTagBoxes = stats.needsTag;
  const issueBoxes = stats.issues;

  const displayName =
    user?.name?.trim() ||
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    "Technician";

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4d6029"
          />
        }
        contentContainerStyle={{
          paddingHorizontal: isWeb ? 24 : 18,
          paddingTop: 16,
          paddingBottom: 28,
          maxWidth: 600,
          width: "100%",
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-1 pr-3">
            <Text className="text-[11px] font-poppins-semibold tracking-wider text-[#64748b] uppercase">
              MultiFactors Sales
            </Text>
            <Text className="text-1xl font-poppins-bold text-[#0f172a] mt-0.5">
              {greeting}, {displayName}!
            </Text>
          </View>

          {/* On Duty Status Pill */}
          <TouchableOpacity
            onPress={() => setIsOnDuty(!isOnDuty)}
            activeOpacity={0.8}
            className={`flex-row items-center px-3 py-1.5 rounded-full border ${
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
              className={`text-[11px] font-poppins-semibold ${
                isOnDuty ? "text-emerald-700" : "text-slate-600"
              }`}
            >
              {isOnDuty ? "On Duty" : "Off Duty"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero Quick Scan Card */}
        <View className="bg-[#4d6029] rounded-2xl p-5 mb-6 shadow-md shadow-[#4d6029]/20 relative overflow-hidden">
          {/* Background Decorative Watermark */}
          <View className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={140}
              color="#ffffff"
            />
          </View>

          <View className="flex-row items-center mb-2.5">
            <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center mr-2.5">
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={18}
                color="#ffffff"
              />
            </View>
            <Text className="text-base font-poppins-bold text-white">
              Quick Diagnostic & QR Scan
            </Text>
          </View>

          <Text className="text-xs font-poppins-regular text-white/90 leading-5 mb-4">
            Scan any distribution box to view optical power, ports, and
            connected subscribers.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/user/scanner")}
            className="bg-white rounded-xl py-3 px-4 flex-row items-center justify-center active:scale-[0.98] transition-all shadow-sm"
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons
              name="camera-outline"
              size={18}
              color="#4d6029"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs font-poppins-bold text-[#4d6029]">
              Open QR Scanner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's Summary Section Header */}
        <View className="flex-row items-center justify-between mb-3.5">
          <Text className="text-sm font-poppins-bold text-[#0f172a] uppercase tracking-wider">
            Today{"'"}s Summary
          </Text>
          <Text className="text-[11px] font-poppins-medium text-[#64748b]">
            Live Network Overview
          </Text>
        </View>

        {/* 4 Summary Cards (2x2 Grid) in Requested Order:
            1. All Boxes -> 2. Tagged Box -> 3. Needs Tag -> 4. Issues */}
        <View className="flex-row flex-wrap justify-between mb-6">
          {/* 1. All Boxes */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center">
                <Ionicons name="cube-outline" size={18} color="#334155" />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-slate-500 uppercase tracking-wide">
                Total
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#0f172a]">
              {totalBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#334155] mt-0.5">
              All Boxes
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Network infrastructure
            </Text>
          </View>

          {/* 2. Tagged Box */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#4d6029"
                />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-emerald-700 uppercase tracking-wide">
                Active
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#4d6029]">
              {taggedBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
              Tagged Box
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Verified QR tags
            </Text>
          </View>

          {/* 3. Needs Tag */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                <Ionicons name="pricetag-outline" size={18} color="#d97706" />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-amber-700 uppercase tracking-wide">
                Pending
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#d97706]">
              {needsTagBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
              Needs Tag
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Pending installation
            </Text>
          </View>

          {/* 4. Issues */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center">
                <Ionicons name="warning-outline" size={18} color="#e11d48" />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-rose-700 uppercase tracking-wide">
                Attention
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#e11d48]">
              {issueBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
              Issues
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Requires field audit
            </Text>
          </View>
        </View>

        {/* Recent Scanned Boxes (Clean, Address-free) */}
        <View className="mb-2">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text className="text-sm font-poppins-bold text-[#0f172a] uppercase tracking-wider">
              Recent Scanned Boxes
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/user/boxes")}
              activeOpacity={0.7}
            >
              <Text className="text-xs font-poppins-semibold text-[#4d6029]">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {loading && recentScans.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 border border-slate-200/80 items-center">
              <ActivityIndicator size="small" color="#4d6029" />
              <Text className="text-[11px] font-poppins-medium text-[#64748b] mt-2">
                Loading recent scans...
              </Text>
            </View>
          ) : recentScans.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 border border-slate-200/80 items-center">
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={28}
                color="#94a3b8"
              />
              <Text className="text-xs font-poppins-bold text-[#0f172a] mt-2">
                No scans yet
              </Text>
              <Text className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5 text-center">
                Boxes you scan will appear here.
              </Text>
            </View>
          ) : (
            recentScans.map((scan) => {
              const badge = getScanBadge(scan);
              const details = [scan.siteName, scan.relativeTime]
                .filter(Boolean)
                .join(" · ");

              return (
                <TouchableOpacity
                  key={scan.id}
                  onPress={() => router.replace("/user/boxes")}
                  className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 flex-row items-center justify-between active:bg-slate-50"
                  activeOpacity={0.75}
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center mr-3 border ${badge.iconBg}`}
                    >
                      <MaterialCommunityIcons
                        name={badge.icon}
                        size={20}
                        color={badge.iconColor}
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-poppins-bold text-[#0f172a] mr-2">
                          {scan.boxCode}
                        </Text>
                        <View
                          className={`px-2 py-0.5 rounded-full ${badge.pillBg}`}
                        >
                          <Text
                            className={`text-[10px] font-poppins-semibold ${badge.pillText}`}
                          >
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5"
                        numberOfLines={1}
                      >
                        {details}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Steady Bottom Navigation Bar */}
      <UserBottomNavigation activeRoute="/user/dashboard" />
    </SafeAreaView>
  );
}
