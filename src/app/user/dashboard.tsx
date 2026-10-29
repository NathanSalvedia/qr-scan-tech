import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { useAuth } from "@/services/auth-state";
import { boxService, type DistributionBox } from "@/services/boxes";
import { logsService, type RecentScanItem } from "@/services/logs";
import { settingsService, type OutboxItem } from "@/services/settings";
import {
  calculateDistanceInMeters,
  formatDistance,
  getCurrentLocationAsync,
  openGoogleMapsNavigation,
} from "@/utils/geo";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
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
  if (scan.isAlarm || scan.boxStatus === "ISSUE" || scan.status === "ISSUE") {
    const matches = scan.auditNote?.match(/\[(.*?)\]/g);
    let label = scan.isAlarm ? "Alarm" : "Issue";
    if (matches) {
      for (const m of matches) {
        const inner = m.slice(1, -1).trim();
        if (inner && !inner.includes("LOCATION MISMATCH")) {
          label = inner;
          break;
        }
      }
    }
    return {
      label,
      icon: "alert-circle" as const,
      iconColor: "#e11d48",
      iconBg: "bg-rose-50 border-rose-100",
      pillStyle: { backgroundColor: "#ffe4e6", borderColor: "#fecdd3" },
      textStyle: { color: "#9f1239" },
      dotColor: "#e11d48",
    };
  }
  if (scan.boxStatus === "NEEDS_TAG") {
    return {
      label: "Needs Tag",
      icon: "tag-outline" as const,
      iconColor: "#d97706",
      iconBg: "bg-amber-50 border-amber-100",
      pillStyle: { backgroundColor: "#fef3c7", borderColor: "#fde68a" },
      textStyle: { color: "#92400e" },
      dotColor: "#d97706",
    };
  }
  return {
    label: "Operational",
    icon: "cube" as const,
    iconColor: "#4d6029",
    iconBg: "bg-[#4d6029]/10 border-[#4d6029]/20",
    pillStyle: { backgroundColor: "#AEAC7820", borderColor: "#AEAC7840" },
    textStyle: { color: "#5c5b36" },
    dotColor: "#AEAC78",
  };
};

export default function UserDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

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

  // Field Navigation & Nearest Distribution Node
  const [nearestBox, setNearestBox] = useState<
    (DistributionBox & { distanceMeters: number; distanceText: string }) | null
  >(null);

  // Outbox & Offline Sync state
  const [outboxCount, setOutboxCount] = useState(0);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [outboxModalOpen, setOutboxModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const locateNearestBox = useCallback(async (boxesList: DistributionBox[]) => {
    if (!boxesList || boxesList.length === 0) return;
    try {
      const loc = await getCurrentLocationAsync(5000);
      if (loc) {
        let min = Infinity;
        let closest: (DistributionBox & {
          distanceMeters: number;
          distanceText: string;
        }) | null = null;

        for (const b of boxesList) {
          if (b.latitude && b.longitude) {
            const d = calculateDistanceInMeters(
              loc.latitude,
              loc.longitude,
              Number(b.latitude),
              Number(b.longitude)
            );
            if (d < min) {
              min = d;
              closest = {
                ...b,
                distanceMeters: d,
                distanceText: formatDistance(d),
              };
            }
          }
        }
        if (closest) {
          setNearestBox(closest);
          return;
        }
      }

      // Fallback: If device GPS takes longer than timeout or is disabled on the emulator,
      // preserve previous or show the primary active box with coordinates ready
      setNearestBox((prev) => {
        if (prev) return prev;
        const defaultBox =
          boxesList.find(
            (b) => b.status === "ACTIVE" && b.latitude && b.longitude
          ) || boxesList.find((b) => b.latitude && b.longitude);
        if (defaultBox) {
          return {
            ...defaultBox,
            distanceMeters: 0,
            distanceText: "Coordinates Ready",
          };
        }
        return null;
      });
    } catch (err) {
      console.warn("Could not determine nearest box:", err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    const [boxesRes, scansRes, outboxItemsList] = await Promise.all([
      boxService.getAll(),
      logsService.getMyRecentScans(5),
      settingsService.getOutboxItems(),
    ]);

    const boxes: DistributionBox[] | null =
      boxesRes.success && Array.isArray(boxesRes.boxes)
        ? (boxesRes.boxes as DistributionBox[])
        : null;

    return {
      boxes,
      stats: boxes
        ? {
            total: boxes.length,
            tagged: boxes.filter((b) => b.status === "ACTIVE").length,
            needsTag: boxes.filter((b) => b.status === "NEEDS_TAG").length,
            issues: boxes.filter((b) => b.status === "ISSUE").length,
          }
        : null,
      scans: scansRes.success && scansRes.scans ? scansRes.scans : null,
      outbox: outboxItemsList || [],
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await fetchDashboard();
        if (!isMounted) return;
        if (data.boxes) {
          locateNearestBox(data.boxes);
        }
        if (data.stats) setStats(data.stats);
        if (data.scans) setRecentScans(data.scans);
        if (data.outbox) {
          setOutboxItems(data.outbox);
          setOutboxCount(data.outbox.length);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchDashboard, locateNearestBox]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        try {
          const data = await fetchDashboard();
          if (!isMounted) return;
          if (data.boxes) {
            locateNearestBox(data.boxes);
          }
          if (data.stats) setStats(data.stats);
          if (data.scans) setRecentScans(data.scans);
          if (data.outbox) {
            setOutboxItems(data.outbox);
            setOutboxCount(data.outbox.length);
          }
        } catch (e) {
          console.warn("Dashboard focus refresh error:", e);
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [fetchDashboard, locateNearestBox])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setGreeting(getGreeting());
    try {
      const data = await fetchDashboard();
      if (data.boxes) {
        locateNearestBox(data.boxes);
      }
      if (data.stats) setStats(data.stats);
      if (data.scans) setRecentScans(data.scans);
      if (data.outbox) {
        setOutboxItems(data.outbox);
        setOutboxCount(data.outbox.length);

        // Auto-drain outbox if online
        if (data.outbox.length > 0) {
          settingsService
            .syncOutboxQueue()
            .then(async (syncRes) => {
              if (syncRes.syncedCount > 0) {
                const count = await settingsService.getOutboxCount();
                const items = await settingsService.getOutboxItems();
                setOutboxCount(count);
                setOutboxItems(items);
              }
            })
            .catch(() => {});
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboard, locateNearestBox]);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await settingsService.syncOutboxQueue();
      const updatedCount = await settingsService.getOutboxCount();
      const updatedItems = await settingsService.getOutboxItems();
      setOutboxCount(updatedCount);
      setOutboxItems(updatedItems);
      await handleRefresh();

      if (result.syncedCount > 0) {
        Alert.alert(
          "Sync Complete",
          `🎉 Successfully synchronized ${result.syncedCount} offline ${
            result.syncedCount === 1 ? "record" : "records"
          } to central NOC!`
        );
      } else if (result.failedCount > 0) {
        Alert.alert(
          "Sync Incomplete",
          "Could not reach server. Please check your cellular data or WiFi connection."
        );
      } else {
        Alert.alert("All Synced", "No pending offline items to sync.");
      }
    } catch {
      Alert.alert(
        "Sync Failed",
        "Could not complete sync. Please verify cellular or WiFi connection."
      );
    } finally {
      setIsSyncing(false);
      setOutboxModalOpen(false);
    }
  }, [handleRefresh]);

  const totalBoxes = stats.total;
  const taggedBoxes = stats.tagged;
  const needsTagBoxes = stats.needsTag;
  const issueBoxes = stats.issues;

  const displayName =
    user?.name?.trim() ||
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    "User";

  const isWeb = Platform.OS === "web";
  // Deduplicate by box so each tagged box only appears once showing its latest scan (Top 5 unique boxes)
  const displayedScans = useMemo(() => {
    const uniqueMap = new Map<string, RecentScanItem>();
    for (const scan of recentScans) {
      if (scan.status === "NEEDS_TAG" || scan.boxStatus === "NEEDS_TAG") {
        continue;
      }
      const key = scan.boxId || scan.boxCode;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, scan);
      }
    }
    return Array.from(uniqueMap.values()).slice(0, 5);
  }, [recentScans]);

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

          {/* Outbox & Offline Sync Indicator */}
          <TouchableOpacity
            onPress={() => {
              if (outboxCount > 0) {
                setOutboxModalOpen(true);
              } else {
                handleRefresh();
              }
            }}
            className={`flex-row items-center px-3 py-1.5 rounded-full border ${
              outboxCount > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-[#4d6029]/10 border-[#4d6029]/20"
            }`}
            activeOpacity={0.75}
          >
            {outboxCount > 0 ? (
              <>
                <MaterialCommunityIcons
                  name="cloud-sync-outline"
                  size={14}
                  color="#d97706"
                />
                <Text className="text-[11px] font-poppins-bold text-amber-800 ml-1.5">
                  Outbox ({outboxCount})
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-done-outline" size={14} color="#4d6029" />
                <Text className="text-[10px] font-poppins-bold text-[#4d6029] ml-1.5">
                  {refreshing ? "Syncing..." : "Synced"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Quick Scan Card */}
        <View className="bg-[#4d6029] rounded-2xl p-5 mb-5 shadow-md shadow-[#4d6029]/20 relative overflow-hidden">
          {/* Background Decorative Watermark */}
          <View className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Image
              source={require("@/assets/images/app-logo-white.png")}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
          </View>

          <View className="flex-row items-center mb-2.5">
            <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center mr-2.5">
              <Image
                source={require("@/assets/images/app-logo-white.png")}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
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

        {/* Nearest Distribution Node Quick-Launch Card */}
        {nearestBox && (
          <View className="bg-white rounded-2xl p-4 mb-5 border border-[#4d6029]/25 shadow-sm shadow-[#4d6029]/10">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <Ionicons name="location" size={17} color="#4d6029" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-poppins-bold text-[#4d6029] uppercase tracking-wider">
                    Nearest Distribution Node
                  </Text>
                  <Text
                    className="text-sm font-poppins-bold text-[#0f172a]"
                    numberOfLines={1}
                  >
                    {nearestBox.code} · {nearestBox.siteName}
                  </Text>
                </View>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-[#4d6029]/10 border border-[#4d6029]/20 shrink-0">
                <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                  {nearestBox.distanceText} away
                </Text>
              </View>
            </View>

            <Text
              className="text-[11px] font-poppins text-slate-500 mb-3"
              numberOfLines={1}
            >
              {nearestBox.address || "Field installation location"}
            </Text>

            {/* Dual Actions: Google Maps Navigation + Open Box Details */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() =>
                  openGoogleMapsNavigation(
                    nearestBox.latitude,
                    nearestBox.longitude,
                    nearestBox.siteName
                  )
                }
                className="flex-1 bg-[#4d6029]/10 border border-[#4d6029]/25 py-2.5 rounded-xl flex-row items-center justify-center active:bg-[#4d6029]/20"
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={14} color="#4d6029" />
                <Text className="text-xs font-poppins-bold text-[#4d6029] ml-1.5">
                  Navigate to Box
                </Text>
                <Ionicons
                  name="open-outline"
                  size={12}
                  color="#4d6029"
                  style={{ marginLeft: 4, opacity: 0.7 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/user/box-details",
                    params: { code: nearestBox.code, id: nearestBox.id },
                  })
                }
                className="flex-1 bg-[#4d6029] py-2.5 rounded-xl flex-row items-center justify-center active:opacity-90 shadow-xs"
                activeOpacity={0.88}
              >
                <Ionicons name="cube-outline" size={14} color="#ffffff" />
                <Text className="text-xs font-poppins-bold text-white ml-1.5">
                  Open Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        {/* Recent Scanned Boxes (Top 5 Vertical Cards) */}
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
            displayedScans.map((scan) => {
              const badge = getScanBadge(scan);
              const details = [scan.siteName, scan.relativeTime]
                .filter(Boolean)
                .join(" · ");

              const isNeedsTag =
                scan.boxStatus === "NEEDS_TAG" || scan.status === "NEEDS_TAG";

              return (
                <TouchableOpacity
                  key={scan.id}
                  onPress={() => {
                    if (isNeedsTag) {
                      Alert.alert(
                        "Tagging Required",
                        `Distribution box "${scan.boxCode}" has not been tagged with a physical QR placard yet.\n\nBox specifications and telemetry will become viewable once the tag is affixed and activated on-site.`,
                        [
                          { text: "Dismiss", style: "cancel" },
                          {
                            text: "Open Scanner",
                            onPress: () => router.push("/user/scanner"),
                          },
                        ]
                      );
                      return;
                    }
                    router.push({
                      pathname: "/user/box-details",
                      params: { code: scan.boxCode, id: scan.boxId },
                    });
                  }}
                  className={`bg-white rounded-2xl p-4 mb-3 border ${
                    isNeedsTag
                      ? "border-amber-200/90 shadow-xs"
                      : "border-slate-200/80 shadow-sm shadow-slate-200/40"
                  } flex-row items-center justify-between active:bg-slate-50`}
                  activeOpacity={isNeedsTag ? 0.85 : 0.75}
                >
                  <View className="flex-row items-center flex-1 mr-3">
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
                      <Text className="text-sm font-poppins-bold text-[#0f172a]">
                        {scan.boxCode}
                      </Text>
                      <Text
                        className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5"
                        numberOfLines={1}
                      >
                        {details}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={badge.pillStyle}
                    className="px-2.5 py-1 rounded-full flex-row items-center border"
                  >
                    <View
                      style={{ backgroundColor: badge.dotColor }}
                      className="w-1.5 h-1.5 rounded-full mr-1.5"
                    />
                    <Text
                      style={badge.textStyle}
                      className="text-[10px] font-poppins-semibold"
                      numberOfLines={1}
                    >
                      {badge.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Steady Bottom Navigation Bar */}
      <UserBottomNavigation activeRoute="/user/dashboard" />

      {/* Outbox Offline Sync Modal */}
      <Modal
        visible={outboxModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOutboxModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-w-lg w-full self-center">
            <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center mr-2.5">
                  <MaterialCommunityIcons
                    name="cloud-sync-outline"
                    size={18}
                    color="#d97706"
                  />
                </View>
                <View>
                  <Text className="text-sm font-poppins-bold text-[#0f172a]">
                    Field Outbox Queue
                  </Text>
                  <Text className="text-[11px] font-poppins text-slate-500">
                    {outboxCount} {outboxCount === 1 ? "record" : "records"} awaiting sync
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setOutboxModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100"
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-60 mb-4">
              {outboxItems.length === 0 ? (
                <View className="py-6 items-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={32}
                    color="#4d6029"
                  />
                  <Text className="text-xs font-poppins-bold text-[#0f172a] mt-2">
                    All Field Records Synced
                  </Text>
                  <Text className="text-[11px] font-poppins text-slate-500 mt-0.5">
                    No offline items pending upload.
                  </Text>
                </View>
              ) : (
                outboxItems.map((item) => (
                  <View
                    key={item.id}
                    className="p-3 mb-2 rounded-xl bg-slate-50 border border-slate-200/70 flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-poppins-bold text-[#0f172a]">
                        {item.title || item.type}
                      </Text>
                      <Text className="text-[10px] font-poppins text-slate-500 mt-0.5">
                        Queued:{" "}
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200">
                      <Text className="text-[9px] font-poppins-bold text-amber-800">
                        PENDING
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View className="flex-row gap-2 pt-2 border-t border-slate-100">
              <TouchableOpacity
                onPress={() => setOutboxModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center justify-center"
              >
                <Text className="text-xs font-poppins-semibold text-slate-700">
                  Close
                </Text>
              </TouchableOpacity>
              {outboxCount > 0 && (
                <TouchableOpacity
                  onPress={handleSyncNow}
                  disabled={isSyncing}
                  className="flex-1 py-3 bg-[#4d6029] rounded-xl flex-row items-center justify-center active:opacity-90"
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="cloud-upload"
                        size={16}
                        color="#ffffff"
                      />
                      <Text className="text-xs font-poppins-bold text-white ml-1.5">
                        Sync All Now
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
