import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { logsService, RecentScanItem } from "@/services/logs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BoxFilter = "ALL" | "MAIN_BOX" | "SUB_BOX";

export default function UserBoxesScreen() {
  const [scans, setScans] = useState<RecentScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BoxFilter>("ALL");

  const fetchScans = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await logsService.getMyRecentScans(50);
      if (res.success && Array.isArray(res.scans)) {
        setScans(res.scans);
      }
    } catch (err) {
      console.error("Failed to fetch scan history:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const res = await logsService.getMyRecentScans(50);
        if (isMounted && res.success && Array.isArray(res.scans)) {
          setScans(res.scans);
        }
      } catch (err) {
        console.error("Failed to load initial scan history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Automatically refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      (async () => {
        try {
          const res = await logsService.getMyRecentScans(50);
          if (isCurrent && res.success && Array.isArray(res.scans)) {
            setScans(res.scans);
          }
        } catch (e) {
          console.error("Focus refresh scan error:", e);
        }
      })();
      return () => {
        isCurrent = false;
      };
    }, [])
  );

  // Dynamic filter
  const filteredHistory = useMemo(() => {
    return scans.filter((entry) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        entry.boxCode.toLowerCase().includes(q) ||
        (entry.tier || "").toLowerCase().includes(q) ||
        (entry.siteName || "").toLowerCase().includes(q);

      let matchesFilter = true;
      if (activeFilter === "MAIN_BOX") {
        matchesFilter = entry.category === "MAIN_BOX";
      } else if (activeFilter === "SUB_BOX") {
        matchesFilter = entry.category === "SUB_BOX";
      }

      return matchesSearch && matchesFilter;
    });
  }, [scans, searchQuery, activeFilter]);

  const todayLabel = useMemo(() => {
    return `Today · ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }, []);

  // Format exact time technician scanned the box in Philippine timezone (Asia/Manila)
  const formatScanTime = useCallback((createdAt?: string, fallback?: string): string => {
    if (!createdAt) return fallback || "Just now";
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return fallback || "Just now";
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      });
    } catch {
      return fallback || "Just now";
    }
  }, []);

  // Client-side local date grouping in Asia/Manila so scan history accurately groups by calendar day
  const getScanDateGroup = useCallback((createdAt?: string, serverGroup?: string): "TODAY" | "YESTERDAY" | "EARLIER" => {
    if (serverGroup && (serverGroup === "TODAY" || serverGroup === "YESTERDAY" || serverGroup === "EARLIER")) {
      return serverGroup;
    }
    if (!createdAt) return "TODAY";
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return "TODAY";
      const now = new Date();
      const todayManila = now.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(now.getDate() - 1);
      const yesterdayManila = yesterdayDate.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
      const scanManila = d.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });

      if (scanManila === todayManila) return "TODAY";
      if (scanManila === yesterdayManila) return "YESTERDAY";
      return "EARLIER";
    } catch {
      return "TODAY";
    }
  }, []);

  const handleOpenBoxDetails = (boxCode: string) => {
    router.push({
      pathname: "/user/box-details",
      params: { code: boxCode },
    });
  };

  const getCategoryBadge = (category: string) => {
    const isMain = category === "MAIN_BOX";
    return (
      <View
        className={`px-2 py-0.5 rounded-md ${
          isMain ? "bg-[#4d6029]/10" : "bg-amber-500/10"
        }`}
      >
        <Text
          className={`text-[9px] font-poppins-bold ${
            isMain ? "text-[#4d6029]" : "text-amber-800"
          }`}
        >
          {isMain ? "MAIN BOX" : "SUB BOX"}
        </Text>
      </View>
    );
  };

  const getStatusPill = (status: string) => {
    if (status === "ACTIVE") {
      return (
        <View
          style={{ backgroundColor: "#AEAC7820", borderColor: "#AEAC7840" }}
          className="px-2.5 py-0.5 rounded-full flex-row items-center border"
        >
          <View
            style={{ backgroundColor: "#AEAC78" }}
            className="w-1.5 h-1.5 rounded-full mr-1.5"
          />
          <Text
            style={{ color: "#5c5b36" }}
            className="text-[10px] font-poppins-semibold"
          >
            Operational
          </Text>
        </View>
      );
    }
    if (status === "ISSUE") {
      return (
        <View className="bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full flex-row items-center">
          <View className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5" />
          <Text className="text-[10px] font-poppins-semibold text-rose-800">
            Signal Loss
          </Text>
        </View>
      );
    }
    return (
      <View className="bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full flex-row items-center">
        <View className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5" />
        <Text className="text-[10px] font-poppins-semibold text-amber-800">
          Needs Tag
        </Text>
      </View>
    );
  };

  const todayScans = filteredHistory.filter(
    (item) => getScanDateGroup(item.createdAt, item.dateGroup) === "TODAY"
  );
  const earlierScans = filteredHistory.filter(
    (item) => getScanDateGroup(item.createdAt, item.dateGroup) !== "TODAY"
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      {/* Main Container */}
      <View className="flex-1 px-4 pt-3 max-w-[600px] w-full self-center">
        {/* Top Screen Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-[11px] font-poppins-semibold tracking-wider text-[#64748b] uppercase">
              MultiFactors Sales
            </Text>
            <Text className="text-2xl font-poppins-bold text-[#0f172a] mt-0.5">
              Scan History
            </Text>
          </View>
          <View className="w-10 h-10 rounded-2xl bg-[#4d6029]/10 items-center justify-center border border-[#4d6029]/20">
            <MaterialCommunityIcons
              name="archive-clock-outline"
              size={22}
              color="#4d6029"
            />
          </View>
        </View>

        {/* Search Bar */}
        <View className="bg-white rounded-xl px-3.5 py-2.5 flex-row items-center border border-slate-200 shadow-sm mb-3">
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search by box code (e.g. DB-MN-01)..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a] p-0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View className="flex-row mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 12 }}
          >
            <TouchableOpacity
              onPress={() => setActiveFilter("ALL")}
              className={`px-3 py-1.5 rounded-full mr-2 border ${
                activeFilter === "ALL"
                  ? "bg-[#4d6029] border-[#4d6029]"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-[11px] font-poppins-semibold ${
                  activeFilter === "ALL" ? "text-white" : "text-[#64748b]"
                }`}
              >
                All ({scans.length})
              </Text>
            </TouchableOpacity>

            {/* Category: Main Boxes */}
            <TouchableOpacity
              onPress={() => setActiveFilter("MAIN_BOX")}
              className={`px-3 py-1.5 rounded-full mr-2 border flex-row items-center ${
                activeFilter === "MAIN_BOX"
                  ? "bg-[#4d6029] border-[#4d6029]"
                  : "bg-white border-slate-200"
              }`}
            >
              <MaterialCommunityIcons
                name="server-network"
                size={12}
                color={activeFilter === "MAIN_BOX" ? "#ffffff" : "#4d6029"}
                style={{ marginRight: 4 }}
              />
              <Text
                className={`text-[11px] font-poppins-semibold ${
                  activeFilter === "MAIN_BOX" ? "text-white" : "text-[#64748b]"
                }`}
              >
                Main Boxes (
                {scans.filter((b) => b.category === "MAIN_BOX").length}
                )
              </Text>
            </TouchableOpacity>

            {/* Category: Sub-Boxes */}
            <TouchableOpacity
              onPress={() => setActiveFilter("SUB_BOX")}
              className={`px-3 py-1.5 rounded-full border flex-row items-center ${
                activeFilter === "SUB_BOX"
                  ? "bg-[#4d6029] border-[#4d6029]"
                  : "bg-white border-slate-200"
              }`}
            >
              <MaterialCommunityIcons
                name="lan"
                size={12}
                color={activeFilter === "SUB_BOX" ? "#ffffff" : "#b45309"}
                style={{ marginRight: 4 }}
              />
              <Text
                className={`text-[11px] font-poppins-semibold ${
                  activeFilter === "SUB_BOX" ? "text-white" : "text-[#64748b]"
                }`}
              >
                Sub-Boxes (
                {scans.filter((b) => b.category === "SUB_BOX").length}
                )
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Scrollable Content: Scan History */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchScans}
              colors={["#4d6029"]}
              tintColor="#4d6029"
            />
          }
        >
          {loading && scans.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-slate-200/80 my-4">
              <ActivityIndicator size="small" color="#4d6029" />
              <Text className="text-xs font-poppins-medium text-[#64748b] mt-3">
                Loading scan history...
              </Text>
            </View>
          ) : filteredHistory.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-slate-200/80 my-4">
              <Ionicons name="file-tray-outline" size={38} color="#94a3b8" />
              <Text className="text-sm font-poppins-bold text-[#0f172a] mt-3">
                No Scans Found
              </Text>
              <Text className="text-xs font-poppins-medium text-[#64748b] text-center mt-1">
                {searchQuery || activeFilter !== "ALL"
                  ? "Try adjusting your search query or filter tags."
                  : "Scan a distribution box with the QR scanner to see it here."}
              </Text>
            </View>
          ) : (
            <View>
              {/* Date Group: Today */}
              {todayScans.length > 0 && (
                <View>
                  <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase mb-2 ml-1">
                    {todayLabel}
                  </Text>
                  {todayScans.map((item) => {
                    const status = (item.status || item.boxStatus || "ACTIVE") as
                      | "ACTIVE"
                      | "NEEDS_TAG"
                      | "ISSUE";
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleOpenBoxDetails(item.boxCode)}
                        className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 active:bg-slate-50"
                        activeOpacity={0.78}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center flex-1 pr-2">
                            <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                              <MaterialCommunityIcons
                                name={
                                  item.category === "MAIN_BOX"
                                    ? "server-network"
                                    : "cube-outline"
                                }
                                size={18}
                                color="#4d6029"
                              />
                            </View>
                            <View className="flex-1">
                              <View className="flex-row items-center">
                                <Text className="text-sm font-poppins-bold text-[#0f172a] mr-2">
                                  {item.boxCode}
                                </Text>
                                {getCategoryBadge(item.category)}
                              </View>
                              <Text
                                numberOfLines={1}
                                className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5"
                              >
                                {item.siteName || item.tier || "Distribution Node"}
                              </Text>
                            </View>
                          </View>
                          {getStatusPill(status)}
                        </View>

                        {/* Technical Specs Row */}
                        <View className="flex-row items-center justify-between bg-[#f8fafc] rounded-xl p-2.5 my-1.5 border border-slate-100">
                          <View className="flex-row items-center">
                            <MaterialCommunityIcons
                              name="lan"
                              size={13}
                              color="#64748b"
                            />
                            <Text className="text-[11px] font-poppins-medium text-[#475569] ml-1">
                              {item.portsUsed ?? 0}/{item.totalPorts ?? 24} Ports
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons
                              name="time-outline"
                              size={13}
                              color="#64748b"
                            />
                            <Text className="text-[11px] font-poppins-medium text-[#64748b] ml-1">
                              {formatScanTime(item.createdAt, item.timeLabel)}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Date Group: Earlier Scans */}
              {earlierScans.length > 0 && (
                <View className={todayScans.length > 0 ? "mt-3" : ""}>
                  <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase mb-2 ml-1">
                    Yesterday & Earlier
                  </Text>
                  {earlierScans.map((item) => {
                    const status = (item.status || item.boxStatus || "ACTIVE") as
                      | "ACTIVE"
                      | "NEEDS_TAG"
                      | "ISSUE";
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleOpenBoxDetails(item.boxCode)}
                        className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 active:bg-slate-50"
                        activeOpacity={0.78}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center flex-1 pr-2">
                            <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-2.5">
                              <MaterialCommunityIcons
                                name={
                                  item.category === "MAIN_BOX"
                                    ? "server-network"
                                    : "cube-outline"
                                }
                                size={18}
                                color="#475569"
                              />
                            </View>
                            <View className="flex-1">
                              <View className="flex-row items-center">
                                <Text className="text-sm font-poppins-bold text-[#0f172a] mr-2">
                                  {item.boxCode}
                                </Text>
                                {getCategoryBadge(item.category)}
                              </View>
                              <Text
                                numberOfLines={1}
                                className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5"
                              >
                                {item.siteName || item.tier || "Distribution Node"}
                              </Text>
                            </View>
                          </View>
                          {getStatusPill(status)}
                        </View>

                        <View className="flex-row items-center justify-between bg-[#f8fafc] rounded-xl p-2.5 my-1.5 border border-slate-100">
                          <View className="flex-row items-center">
                            <MaterialCommunityIcons
                              name="lan"
                              size={13}
                              color="#64748b"
                            />
                            <Text className="text-[11px] font-poppins-medium text-[#475569] ml-1">
                              {item.portsUsed ?? 0}/{item.totalPorts ?? 24} Ports
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons
                              name="time-outline"
                              size={13}
                              color="#64748b"
                            />
                            <Text className="text-[11px] font-poppins-medium text-[#64748b] ml-1">
                              {formatScanTime(item.createdAt, item.timeLabel)}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Steady Bottom Navigation Bar */}
      <UserBottomNavigation activeRoute="/user/boxes" />
    </SafeAreaView>
  );
}
