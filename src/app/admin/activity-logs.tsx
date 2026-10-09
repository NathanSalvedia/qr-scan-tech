import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  logsService,
  type AuditLogItem,
  type EventCategory,
} from "@/services/logs";

export type { AuditLogItem, EventCategory };

type CategoryFilter =
  | "ALL"
  | "SCAN"
  | "ALARM"
  | "BOX_UPDATE"
  | "PRINT"
  | "PORT_CHANGE"
  | "USER_REGISTER";

export default function ActivityLogsScreen() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<CategoryFilter>("ALL");

  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      try {
        const res = await logsService.getAll();
        if (!isMounted) return;

        if (res.success && res.logs) {
          setLogs(res.logs);
        } else {
          setError(res.message || "Failed to load audit logs");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to connect to logs service");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const res = await logsService.getAll();
      if (res.success && res.logs) {
        setLogs(res.logs);
      } else {
        setError(res.message || "Failed to load audit logs");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to logs service");
    } finally {
      setRefreshing(false);
    }
  }, []);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Inspector Modal State
  const [selectedLogForDetails, setSelectedLogForDetails] =
    useState<AuditLogItem | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const isWeb = Platform.OS === "web";

  // Filter & Search Logic
  const filteredLogs = logs.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      query === "" ||
      item.targetBoxCode.toLowerCase().includes(query) ||
      item.targetBoxName.toLowerCase().includes(query) ||
      item.actorName.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (
      activeCategoryFilter !== "ALL" &&
      item.category !== activeCategoryFilter
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const getCategoryBadge = (cat: EventCategory) => {
    switch (cat) {
      case "SCAN":
        return {
          bg: "bg-emerald-50 border border-emerald-200",
          text: "text-emerald-700",
          icon: "qrcode-scan",
          label: "QR Field Scan",
        };
      case "ALARM":
        return {
          bg: "bg-rose-50 border border-rose-200",
          text: "text-rose-700",
          icon: "alert-circle",
          label: "Hardware Alarm",
        };
      case "BOX_UPDATE":
        return {
          bg: "bg-indigo-50 border border-indigo-200",
          text: "text-indigo-700",
          icon: "server-network",
          label: "Box Registered",
        };
      case "PRINT":
        return {
          bg: "bg-amber-50 border border-amber-200",
          text: "text-amber-800",
          icon: "printer",
          label: "A4 Print Batch",
        };
      case "PORT_CHANGE":
        return {
          bg: "bg-sky-50 border border-sky-200",
          text: "text-sky-700",
          icon: "lan-connect",
          label: "Port Provisioned",
        };
      case "USER_REGISTER":
        return {
          bg: "bg-[#AEAC78]/25 border border-[#AEAC78]/80",
          text: "text-[#2d3416]",
          icon: "account-plus",
          label: "User Registered",
        };
    }
  };

  const handleExportLogs = () => {
    if (logs.length === 0) {
      if (isWeb) {
        window.alert("No audit logs available to export.");
      } else {
        Alert.alert("Export Audit Log", "No audit logs available to export.");
      }
      return;
    }

    const headers = [
      "Timestamp",
      "Category",
      "Actor Name",
      "Actor ID",
      "Target Box Code",
      "Target Box Name",
      "Title",
      "Description",
      "Device / IP",
    ];
    const rows = logs.map((l) => [
      `"${(l.timestamp || "").replace(/"/g, '""')}"`,
      `"${(l.category || "").replace(/"/g, '""')}"`,
      `"${(l.actorName || "").replace(/"/g, '""')}"`,
      `"${(l.actorId || l.actorType || "").replace(/"/g, '""')}"`,
      `"${(l.targetBoxCode || "").replace(/"/g, '""')}"`,
      `"${(l.targetBoxName || "").replace(/"/g, '""')}"`,
      `"${(l.title || "").replace(/"/g, '""')}"`,
      `"${(l.description || "").replace(/"/g, '""')}"`,
      `"${(l.deviceOrIp || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    if (isWeb && typeof document !== "undefined") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      Alert.alert(
        "Audit Log Export",
        `Generated CSV report with ${logs.length} records.`,
      );
    }
  };

  const scanCount = logs.filter((l) => l.category === "SCAN").length;
  const alarmCount = logs.filter((l) => l.category === "ALARM").length;
  const updateCount = logs.filter(
    (l) => l.category === "BOX_UPDATE" || l.category === "PORT_CHANGE",
  ).length;
  const printCount = logs.filter((l) => l.category === "PRINT").length;
  const userRegCount = logs.filter(
    (l) => l.category === "USER_REGISTER",
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />

      <View className="flex-1 flex-row h-full">
        {/* Responsive Collapsible Sidebar */}
        {isWeb && (
          <SidebarNavigation
            activeRoute="/admin/activity-logs"
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex"
          />
        )}

        {/* Main Activity Logs Canvas */}
        <View className="flex-1 flex-col h-full overflow-hidden">
          <ScrollView
            showsVerticalScrollIndicator={true}
            className="flex-1 p-4 md:p-6"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Top Page Header */}
            <View className="flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200/80 gap-4 mb-5">
              <View>
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3">
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color="#4d6029"
                    />
                  </View>
                  <Text className="text-2xl font-poppins-bold text-[#0f172a]">
                    System Activity & Field Audit Logs
                  </Text>
                </View>
                <Text className="text-xs font-poppins text-[#64748b] mt-1 ml-12">
                  Immutable real-time audit trail of QR scans, enclosure
                  updates, print jobs, and alarm telemetry.
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center space-x-2.5">
                <TouchableOpacity
                  onPress={handleRefresh}
                  disabled={refreshing}
                  className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-2xl flex-row items-center shadow-sm mr-2"
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color="#475569"
                  />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleExportLogs}
                  className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm"
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    Export Audit Log
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Notification Banner */}
            {error && (
              <View className="mb-4 bg-rose-50 border border-rose-200 p-4 rounded-2xl flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="alert-circle" size={18} color="#e11d48" />
                  <Text className="text-xs font-poppins text-rose-800 ml-2">
                    {error}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRefresh}>
                  <Text className="text-xs font-poppins-bold text-rose-700 underline">
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 1. TOP ROW OF 4 SUMMARY METRIC CARDS */}
            <View className="flex-row flex-wrap -mx-2 mb-5">
              {/* Card 1: Total Events */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Total Events Logged
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center border border-slate-200">
                      <MaterialCommunityIcons
                        name="history"
                        size={16}
                        color="#475569"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {logs.length}
                    </Text>
                    <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-poppins-bold text-[#475569]">
                        100% Immutable
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Recorded Operational Events
                  </Text>
                </View>
              </View>

              {/* Card 2: Field QR Scans */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Verified QR Scans
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-200">
                      <MaterialCommunityIcons
                        name="qrcode-scan"
                        size={16}
                        color="#059669"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {scanCount}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Text className="text-[10px] font-poppins-bold text-emerald-700">
                        GPS Verified
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    On-Site Field Scans
                  </Text>
                </View>
              </View>

              {/* Card 3: Hardware Alarms */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View
                  className={`bg-white p-5 rounded-3xl border-2 ${
                    alarmCount > 0 ? "border-rose-500/30" : "border-slate-200/80"
                  } shadow-sm justify-between h-32`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Hardware Alarms
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center border border-rose-200">
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={alarmCount > 0 ? "#dc2626" : "#64748b"}
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {alarmCount}
                    </Text>
                    <View
                      className={`px-2 py-0.5 rounded-full border ${
                        alarmCount > 0
                          ? "bg-rose-50 border-rose-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-poppins-bold ${
                          alarmCount > 0 ? "text-rose-700" : "text-slate-600"
                        }`}
                      >
                        {alarmCount > 0
                          ? `${alarmCount} Active Fault${alarmCount > 1 ? "s" : ""}`
                          : "Nominal"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    {alarmCount > 0
                      ? "Hardware & Optical Alarms"
                      : "Zero Active Anomalies"}
                  </Text>
                </View>
              </View>

              {/* Card 4: Registrations & System Activity */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Registrations & Prints
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center border border-amber-200">
                      <MaterialCommunityIcons
                        name="account-plus-outline"
                        size={16}
                        color="#d97706"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {userRegCount + printCount + updateCount}
                    </Text>
                    <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Text className="text-[10px] font-poppins-bold text-amber-800">
                        {userRegCount} Registered
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Users, Nodes & Placards
                  </Text>
                </View>
              </View>
            </View>

            {/* 2. SEARCH & FILTER CONTROLS BAR */}
            <View className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm mb-5 flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar Input */}
              <View className="flex-1 flex-row items-center bg-[#f8fafc] border border-slate-200/80 rounded-2xl px-3.5 py-2.5">
                <Ionicons name="search" size={17} color="#64748b" />
                <TextInput
                  placeholder="Search by box code (e.g. DB-MN-01), technician name, or action keyword..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setCurrentPage(1);
                  }}
                  className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a]"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Tabs */}
              <View className="flex-row items-center flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: `All Events (${logs.length})` },
                  { id: "SCAN", label: `📱 Scans (${scanCount})` },
                  { id: "ALARM", label: `🚨 Alarms (${alarmCount})` },
                  { id: "USER_REGISTER", label: `👤 Registrations (${userRegCount})` },
                  { id: "BOX_UPDATE", label: `📦 Updates (${updateCount})` },
                  { id: "PRINT", label: `🖨️ Prints (${printCount})` },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => {
                      setActiveCategoryFilter(filter.id as CategoryFilter);
                      setCurrentPage(1);
                    }}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-xl border ${
                      activeCategoryFilter === filter.id
                        ? "bg-[#4d6029] border-[#4d6029]"
                        : "bg-white border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-poppins-bold ${
                        activeCategoryFilter === filter.id
                          ? "text-white"
                          : "text-[#475569]"
                      }`}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 3. AUDIT LOGS TIMELINE DATA TABLE */}
            <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
              {/* Table Header Summary Strip */}
              <View className="px-6 py-4 border-b border-slate-100 flex-row items-center justify-between bg-white">
                <View className="flex-row items-center">
                  <Text className="text-sm font-poppins-bold text-[#0f172a]">
                    Audit Events Feed
                  </Text>
                  <View className="bg-slate-100 px-2.5 py-0.5 rounded-full ml-2.5">
                    <Text className="text-[11px] font-poppins-bold text-[#475569]">
                      {filteredLogs.length} Records
                    </Text>
                  </View>
                </View>
                <Text className="text-xs font-poppins text-[#94a3b8]">
                  Automated security logging with timestamp signatures
                </Text>
              </View>

              {/* Responsive Horizontal Scroll Container */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="w-full"
                contentContainerStyle={{ minWidth: "100%", flexGrow: 1 }}
              >
                <View className="w-full flex-1 min-w-[1050px]">
                  {/* Table Column Header */}
                  <View className="flex-row bg-[#f8fafc] border-b border-slate-200/80 px-6 py-3.5 items-center w-full">
                    <View className="flex-[1.5] min-w-[150px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Timestamp
                      </Text>
                    </View>
                    <View className="flex-[1.5] min-w-[150px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Event Category
                      </Text>
                    </View>
                    <View className="flex-[1.8] min-w-[180px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Actor / Technician
                      </Text>
                    </View>
                    <View className="flex-[1.8] min-w-[180px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Target Box
                      </Text>
                    </View>
                    <View className="flex-[3] min-w-[300px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Activity Summary & Notes
                      </Text>
                    </View>
                    <View className="w-[90px] min-w-[90px] text-right">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider text-right">
                        Action
                      </Text>
                    </View>
                  </View>

                  {/* Table Body Rows */}
                  {loading && logs.length === 0 ? (
                    <View className="py-16 items-center justify-center">
                      <ActivityIndicator size="large" color="#4d6029" />
                      <Text className="text-xs font-poppins-medium text-slate-500 mt-3">
                        Loading system activity logs...
                      </Text>
                    </View>
                  ) : paginatedLogs.length === 0 ? (
                    <View className="py-16 items-center justify-center px-4">
                      <View className="w-12 h-12 rounded-2xl bg-slate-100 items-center justify-center mb-3">
                        <MaterialCommunityIcons
                          name="text-box-search-outline"
                          size={24}
                          color="#94a3b8"
                        />
                      </View>
                      <Text className="text-sm font-poppins-bold text-[#0f172a]">
                        No activity records found
                      </Text>
                      <Text className="text-xs font-poppins text-slate-500 text-center max-w-sm mt-1">
                        {searchQuery || activeCategoryFilter !== "ALL"
                          ? "Try adjusting your search terms or clearing category filters to find records."
                          : "No activity records have been logged in the system yet."}
                      </Text>
                      {(searchQuery || activeCategoryFilter !== "ALL") && (
                        <TouchableOpacity
                          onPress={() => {
                            setSearchQuery("");
                            setActiveCategoryFilter("ALL");
                            setCurrentPage(1);
                          }}
                          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl"
                        >
                          <Text className="text-xs font-poppins-bold text-slate-700">
                            Clear Filters
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    paginatedLogs.map((item, index) => {
                      const catMeta = getCategoryBadge(item.category);

                      return (
                        <View
                          key={item.id}
                          className={`flex-row items-center px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors w-full ${
                            index % 2 === 1 ? "bg-[#fafbfc]" : "bg-white"
                          }`}
                        >
                          {/* 1. Timestamp */}
                          <View className="flex-[1.5] min-w-[150px] pr-2">
                            <Text className="text-xs font-poppins-bold text-[#0f172a]">
                              {item.timestamp.split("·")[1]?.trim() ||
                                item.timestamp}
                            </Text>
                            <View className="flex-row items-center mt-0.5">
                              <Text className="text-[10px] font-poppins text-[#64748b]">
                                {item.timestamp.split("·")[0]?.trim()} ·{" "}
                                {item.relativeTime}
                              </Text>
                            </View>
                          </View>

                          {/* 2. Event Category Badge */}
                          <View className="flex-[1.5] min-w-[150px] pr-2">
                            <View
                              className={`inline-flex self-start px-2.5 py-1 rounded-lg flex-row items-center ${catMeta.bg}`}
                            >
                              <MaterialCommunityIcons
                                name={catMeta.icon as any}
                                size={12}
                                color={
                                  item.category === "ALARM"
                                    ? "#dc2626"
                                    : item.category === "USER_REGISTER"
                                    ? "#4d6029"
                                    : "#059669"
                                }
                              />
                              <Text
                                className={`text-[10px] font-poppins-bold ml-1.5 ${catMeta.text}`}
                              >
                                {catMeta.label}
                              </Text>
                            </View>
                          </View>

                          {/* 3. Actor / Technician */}
                          <View className="flex-[1.8] min-w-[180px] pr-2">
                            <Text
                              className="text-xs font-poppins-bold text-[#0f172a]"
                              numberOfLines={1}
                            >
                              {item.actorName}
                            </Text>
                            <Text
                              className="text-[10px] font-poppins text-[#64748b]"
                              numberOfLines={1}
                            >
                              {item.actorId || item.actorType}
                            </Text>
                          </View>

                          {/* 4. Target Box */}
                          <View className="flex-[1.8] min-w-[180px] pr-2">
                            <View className="flex-row items-center">
                              <View
                                className={`px-2 py-0.5 rounded-md mr-1.5 ${
                                  item.category === "USER_REGISTER"
                                    ? "bg-[#4d6029]"
                                    : "bg-[#0f172a]"
                                }`}
                              >
                                <Text className="text-[10px] font-poppins-bold text-white">
                                  {item.targetBoxCode}
                                </Text>
                              </View>
                            </View>
                            <Text
                              className="text-[10px] font-poppins text-[#64748b] mt-0.5"
                              numberOfLines={1}
                            >
                              {item.targetBoxName}
                            </Text>
                          </View>

                          {/* 5. Summary & Description */}
                          <View className="flex-[3] min-w-[300px] pr-3">
                            <Text
                              className="text-xs font-poppins-bold text-[#0f172a]"
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Text
                              className="text-[11px] font-poppins text-[#64748b] mt-0.5"
                              numberOfLines={2}
                            >
                              {item.description}
                            </Text>
                          </View>

                          {/* 6. Actions */}
                          <View className="w-[90px] min-w-[90px] flex-row items-center justify-end">
                            <TouchableOpacity
                              onPress={() => setSelectedLogForDetails(item)}
                              className="bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg flex-row items-center shadow-xs"
                            >
                              <Ionicons
                                name="eye-outline"
                                size={12}
                                color="#ffffff"
                              />
                              <Text className="text-[10px] font-poppins-bold text-white ml-1">
                                View
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>

              {/* Table Pagination Footer */}
              <View className="px-6 py-4 border-t border-slate-100 flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                {/* Left: Summary text & rows per page */}
                <View className="flex-row items-center flex-wrap gap-3">
                  <Text className="text-xs font-poppins-medium text-[#64748b]">
                    Showing{" "}
                    <Text className="font-poppins-bold text-[#0f172a]">
                      {filteredLogs.length === 0 ? 0 : startIndex + 1} -{" "}
                      {endIndex}
                    </Text>{" "}
                    of{" "}
                    <Text className="font-poppins-bold text-[#0f172a]">
                      {filteredLogs.length}
                    </Text>{" "}
                    events
                  </Text>

                  {/* Rows per page selector */}
                  <View className="flex-row items-center bg-slate-100 px-2 py-0.5 rounded-lg">
                    <Text className="text-[10px] font-poppins-medium text-[#64748b] mr-1.5">
                      Show:
                    </Text>
                    {[5, 10, 20].map((size) => (
                      <TouchableOpacity
                        key={size}
                        onPress={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        className={`px-2 py-0.5 rounded-md ${
                          pageSize === size ? "bg-[#4d6029]" : "bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-poppins-bold ${
                            pageSize === size ? "text-white" : "text-[#475569]"
                          }`}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Right: Previous / Page Numbers / Next */}
                <View className="flex-row items-center space-x-1">
                  {/* Previous Button */}
                  <TouchableOpacity
                    onPress={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={safeCurrentPage === 1}
                    className={`px-3 py-1.5 rounded-xl border flex-row items-center mr-1 ${
                      safeCurrentPage === 1
                        ? "bg-slate-50 border-slate-200 opacity-40"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Ionicons name="chevron-back" size={12} color="#475569" />
                    <Text className="text-xs font-poppins-bold text-[#475569] ml-1">
                      Previous
                    </Text>
                  </TouchableOpacity>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <TouchableOpacity
                        key={pageNum}
                        onPress={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl items-center justify-center border mx-0.5 ${
                          safeCurrentPage === pageNum
                            ? "bg-[#4d6029] border-[#4d6029]"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Text
                          className={`text-xs font-poppins-bold ${
                            safeCurrentPage === pageNum
                              ? "text-white"
                              : "text-[#475569]"
                          }`}
                        >
                          {pageNum}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}

                  {/* Next Button */}
                  <TouchableOpacity
                    onPress={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={
                      safeCurrentPage === totalPages || totalPages === 0
                    }
                    className={`px-3 py-1.5 rounded-xl border flex-row items-center ml-1 ${
                      safeCurrentPage === totalPages || totalPages === 0
                        ? "bg-slate-50 border-slate-200 opacity-40"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Text className="text-xs font-poppins-bold text-[#475569] mr-1">
                      Next
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color="#475569"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* INSPECTOR MODAL: AUDIT EVENT DETAIL & TELEMETRY */}
      {selectedLogForDetails && (
        <Modal
          visible={!!selectedLogForDetails}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedLogForDetails(null)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] shadow-2xl border border-slate-100 overflow-hidden flex-col">
              {/* Header */}
              <View className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-3">
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color="#4d6029"
                    />
                  </View>
                  <View>
                    <Text className="text-base font-poppins-bold text-[#0f172a]">
                      Audit Event Record
                    </Text>
                    <Text className="text-[11px] font-mono text-[#64748b]">
                      {selectedLogForDetails.id}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedLogForDetails(null)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Event Content Body */}
              <ScrollView className="p-6 flex-1 max-h-[55vh] space-y-3.5">
                {/* Event Category & Title */}
                <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 mb-3">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View
                      className={`inline-flex self-start px-2.5 py-0.5 rounded-md ${
                        getCategoryBadge(selectedLogForDetails.category).bg
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-poppins-bold ${
                          getCategoryBadge(selectedLogForDetails.category).text
                        }`}
                      >
                        {getCategoryBadge(selectedLogForDetails.category).label}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-poppins text-[#64748b]">
                      {selectedLogForDetails.timestamp}
                    </Text>
                  </View>

                  <Text className="text-sm font-poppins-bold text-[#0f172a]">
                    {selectedLogForDetails.title}
                  </Text>
                  <Text className="text-xs font-poppins text-[#475569] mt-1 leading-relaxed">
                    {selectedLogForDetails.description}
                  </Text>
                </View>

                {/* Target Box & Actor Grid */}
                <View className="grid grid-cols-2 gap-2.5 mb-3">
                  <View className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <Text className="text-[10px] font-poppins-semibold text-[#64748b]">
                      {selectedLogForDetails.category === "USER_REGISTER"
                        ? "Account Role"
                        : "Target Enclosure"}
                    </Text>
                    <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
                      {selectedLogForDetails.targetBoxCode}
                    </Text>
                    <Text
                      className="text-[10px] font-poppins text-[#64748b]"
                      numberOfLines={1}
                    >
                      {selectedLogForDetails.targetBoxName}
                    </Text>
                  </View>

                  <View className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <Text className="text-[10px] font-poppins-semibold text-[#64748b]">
                      {selectedLogForDetails.category === "USER_REGISTER"
                        ? "Registered User"
                        : "Actor / Operator"}
                    </Text>
                    <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
                      {selectedLogForDetails.actorName}
                    </Text>
                    <Text
                      className="text-[10px] font-poppins text-[#64748b]"
                      numberOfLines={1}
                    >
                      {selectedLogForDetails.actorId ||
                        selectedLogForDetails.actorType}
                    </Text>
                  </View>
                </View>

                {/* Telemetry & Device Metadata */}
                <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                  <Text className="text-xs font-poppins-bold text-[#0f172a] mb-2">
                    Diagnostic Telemetry & Metadata:
                  </Text>

                  <View className="space-y-1.5 text-xs">
                    <View className="flex-row justify-between py-1 border-b border-slate-200/60">
                      <Text className="text-[11px] font-poppins text-[#64748b]">
                        Client Device / IP
                      </Text>
                      <Text className="text-[11px] font-mono font-medium text-[#0f172a]">
                        {selectedLogForDetails.deviceOrIp}
                      </Text>
                    </View>

                    {selectedLogForDetails.gpsCoordinates && (
                      <View className="flex-row justify-between py-1 border-b border-slate-200/60">
                        <Text className="text-[11px] font-poppins text-[#64748b]">
                          GPS Coordinates
                        </Text>
                        <Text className="text-[11px] font-mono font-medium text-[#4d6029]">
                          {selectedLogForDetails.gpsCoordinates}
                        </Text>
                      </View>
                    )}

                    {selectedLogForDetails.metadata &&
                      Object.entries(selectedLogForDetails.metadata).map(
                        ([k, v]) => (
                          <View
                            key={k}
                            className="flex-row justify-between py-1 border-b border-slate-200/60"
                          >
                            <Text className="text-[11px] font-poppins text-[#64748b]">
                              {k}
                            </Text>
                            <Text className="text-[11px] font-poppins-bold text-[#0f172a]">
                              {v}
                            </Text>
                          </View>
                        ),
                      )}
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex-row items-center justify-end">
                <TouchableOpacity
                  onPress={() => setSelectedLogForDetails(null)}
                  className="px-5 py-2.5 bg-slate-900 rounded-xl"
                >
                  <Text className="text-xs font-poppins-bold text-white">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
