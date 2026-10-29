import { SidebarNavigation, useSidebarCollapse } from "@/components/sidebar-navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
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
  technicianService,
  type Technician,
  type ScanLogEntry,
  type MaintenanceAction,
} from "@/services/technicians";
import { formatDistance } from "@/utils/geo";

export type { Technician, ScanLogEntry, MaintenanceAction };

type TechFilter = "ALL" | "HAS_ALARM";

export default function TechniciansScreen() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<TechFilter>("ALL");
  const { isCollapsed: isSidebarCollapsed, toggleSidebar: toggleSidebarCollapse } = useSidebarCollapse();

  useEffect(() => {
    let isMounted = true;

    async function loadTechnicians(isBackgroundPoll = false) {
      try {
        const res = await technicianService.getAll();
        if (!isMounted) return;

        if (res.success && res.technicians) {
          setTechnicians(res.technicians);
          setError(null);
        } else if (!isBackgroundPoll) {
          setError(res.message || "Failed to load technicians");
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (!isBackgroundPoll) {
          setError(err.message || "Failed to connect to technician service");
        }
      } finally {
        if (isMounted && !isBackgroundPoll) {
          setLoading(false);
        }
      }
    }

    loadTechnicians(false);

    // Auto-refresh every 8 seconds to reflect live technician telemetry
    const interval = setInterval(() => {
      loadTechnicians(true);
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const res = await technicianService.getAll();
      if (res.success && res.technicians) {
        setTechnicians(res.technicians);
      } else {
        setError(res.message || "Failed to load technicians");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to technician service");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Inspector Modal State
  const [selectedTechForDetails, setSelectedTechForDetails] =
    useState<Technician | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<
    "LOGS" | "ACTIONS" | "DEVICE"
  >("LOGS");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const isWeb = Platform.OS === "web";

  // Filter & Search Logic
  const filteredTechs = technicians.filter((tech) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      query === "" ||
      tech.name.toLowerCase().includes(query) ||
      tech.email.toLowerCase().includes(query) ||
      tech.role.toLowerCase().includes(query) ||
      tech.phone.toLowerCase().includes(query) ||
      tech.lastBoxCode.toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (activeFilter === "HAS_ALARM") return tech.activeAlarmsCount > 0;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTechs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTechs.length);
  const paginatedTechs = filteredTechs.slice(startIndex, endIndex);

  const hasAlarmCount = technicians.filter(
    (t) => t.activeAlarmsCount > 0,
  ).length;
  const totalScansToday = technicians.reduce(
    (acc, t) => acc + t.todayScansCount,
    0,
  );
  const totalAlarmsCount = technicians.reduce(
    (acc, t) => acc + t.activeAlarmsCount,
    0,
  );
  const totalScansThisMonth = technicians.reduce(
    (acc, t) => acc + t.totalScansThisMonth,
    0,
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />

      <View className="flex-1 flex-row h-full">
        {/* Responsive Collapsible Sidebar */}
        {isWeb && (
          <SidebarNavigation
            activeRoute="/admin/technicians"
            collapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            className="hidden md:flex"
          />
        )}

        {/* Main Technician Canvas */}
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
                    <Ionicons name="people" size={20} color="#4d6029" />
                  </View>
                  <Text className="text-2xl font-poppins-bold text-[#0f172a]">
                    Technician Operations & Field Activity
                  </Text>
                </View>
                <Text className="text-xs font-poppins text-[#64748b] mt-1 ml-12">
                  Monitor field personnel, track real-time QR scan
                  telemetry, and audit maintenance visits.
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
                    name="refresh"
                    size={15}
                    color="#475569"
                    style={refreshing ? { transform: [{ rotate: "45deg" }] } : undefined}
                  />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/admin/dashboard")}
                  className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm"
                  activeOpacity={0.8}
                >
                  <Ionicons name="map-outline" size={16} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    View Live Map
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Banner */}
            {error && (
              <View className="bg-rose-50 border border-rose-200 p-4 rounded-2xl mb-5 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  <Ionicons name="alert-circle" size={18} color="#e11d48" />
                  <Text className="text-xs font-poppins-medium text-rose-800 ml-2">
                    {error}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleRefresh}
                  className="bg-rose-600 px-3 py-1.5 rounded-xl"
                >
                  <Text className="text-xs font-poppins-bold text-white">Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 1. TOP ROW OF 4 SUMMARY METRIC CARDS */}
            <View className="flex-row flex-wrap -mx-2 mb-5">
              {/* Card 1: Registered Field Crew */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Field Crew Roster
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
                      <Ionicons name="people" size={16} color="#059669" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {technicians.length}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Text className="text-[10px] font-poppins-bold text-emerald-700">
                        Active Roster
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    {technicians.length} Registered Field Personnel
                  </Text>
                </View>
              </View>

              {/* Card 2: Today's QR Scans */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Today&apos;s QR Field Scans
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center border border-[#4d6029]/20">
                      <MaterialCommunityIcons
                        name="qrcode-scan"
                        size={16}
                        color="#4d6029"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {totalScansToday}
                    </Text>
                    <View className="bg-[#4d6029]/10 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                        Live Scans
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Verified Physical Box Inspections
                  </Text>
                </View>
              </View>

              {/* Card 3: Active Alarms / Fault Dispatches */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border-2 border-rose-500/30 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Open Alarm Dispatches
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center border border-rose-200">
                      <Ionicons name="alert-circle" size={16} color="#dc2626" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {totalAlarmsCount}
                    </Text>
                    <View className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <Text className="text-[10px] font-poppins-bold text-rose-700">
                        {totalAlarmsCount > 0 ? "Urgent Action" : "Nominal"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    {totalAlarmsCount > 0
                      ? `${totalAlarmsCount} Nodes Require Attention`
                      : "All Inspected Nodes Normal"}
                  </Text>
                </View>
              </View>

              {/* Card 4: Monthly Field Scans */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Monthly Field Scans
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-sky-50 items-center justify-center border border-sky-100">
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#0284c7"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {totalScansThisMonth}
                    </Text>
                    <View className="bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      <Text className="text-[10px] font-poppins-bold text-sky-700">
                        All Nodes
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Total Physical Verifications This Month
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
                  placeholder="Search by technician name, email, role, or phone..."
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
                  { id: "ALL", label: `All (${technicians.length})` },
                  { id: "HAS_ALARM", label: `⚠️ Alarms (${hasAlarmCount})` },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => {
                      setActiveFilter(filter.id as TechFilter);
                      setCurrentPage(1);
                    }}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-xl border ${
                      activeFilter === filter.id
                        ? "bg-[#4d6029] border-[#4d6029]"
                        : "bg-white border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-poppins-bold ${
                        activeFilter === filter.id
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

            {/* 3. TECHNICIANS INVENTORY DATA TABLE */}
            <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
              {/* Table Header Summary Strip */}
              <View className="px-6 py-4 border-b border-slate-100 flex-row items-center justify-between bg-white">
                <View className="flex-row items-center">
                  <Text className="text-sm font-poppins-bold text-[#0f172a]">
                    Field Personnel
                  </Text>
                  <View className="bg-slate-100 px-2.5 py-0.5 rounded-full ml-2.5">
                    <Text className="text-[11px] font-poppins-bold text-[#475569]">
                      {filteredTechs.length} Technicians
                    </Text>
                  </View>
                </View>
                <Text className="text-xs font-poppins text-[#94a3b8]">
                  Live location updated on each physical QR tag scan
                </Text>
              </View>

              {/* Responsive Horizontal Scroll Container */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="w-full"
                contentContainerStyle={{ minWidth: "100%", flexGrow: 1 }}
              >
                <View className="w-full flex-1 min-w-[1000px]">
                  {/* Table Column Header */}
                  <View className="flex-row bg-[#f8fafc] border-b border-slate-200/80 px-6 py-3.5 items-center w-full">
                    <View className="flex-[2.5] min-w-[240px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Technician & Role
                      </Text>
                    </View>
                    <View className="flex-[2] min-w-[200px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Contact Info
                      </Text>
                    </View>
                    <View className="flex-[2.8] min-w-[260px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Last Box Scanned
                      </Text>
                    </View>
                    <View className="flex-[1.5] min-w-[150px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Today&apos;s Activity
                      </Text>
                    </View>
                    <View className="w-[100px] min-w-[100px] text-right">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider text-right">
                        Actions
                      </Text>
                    </View>
                  </View>

                  {/* Table Body Rows */}
                  {loading ? (
                    <View className="py-20 items-center justify-center w-full">
                      <ActivityIndicator size="large" color="#4d6029" />
                      <Text className="text-xs font-poppins-medium text-[#64748b] mt-3">
                        Loading field personnel data...
                      </Text>
                    </View>
                  ) : paginatedTechs.length === 0 ? (
                    <View className="py-20 items-center justify-center w-full">
                      <Ionicons name="people-outline" size={38} color="#94a3b8" />
                      <Text className="text-sm font-poppins-bold text-[#0f172a] mt-2">
                        No Technicians Found
                      </Text>
                      <Text className="text-xs font-poppins text-[#64748b] mt-1 text-center">
                        {searchQuery
                          ? "No technicians match your search query."
                          : "No registered field technicians found in database."}
                      </Text>
                    </View>
                  ) : (
                    paginatedTechs.map((tech, index) => (
                      <View
                        key={tech.id}
                        className={`flex-row items-center px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors w-full ${
                          index % 2 === 1 ? "bg-[#fafbfc]" : "bg-white"
                        }`}
                      >
                        {/* 1. Technician & Role */}
                        <View className="flex-[2.5] min-w-[240px] pr-2 flex-row items-center">
                          <View
                            className="w-10 h-10 rounded-2xl items-center justify-center mr-3 shadow-xs"
                            style={{ backgroundColor: tech.avatarColor || '#4d6029' }}
                          >
                            <Text className="text-sm font-poppins-bold text-white">
                              {tech.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-xs font-poppins-bold text-[#0f172a]"
                              numberOfLines={1}
                            >
                              {tech.name}
                            </Text>
                            <View className="flex-row items-center mt-0.5">
                              <Text className="text-[10px] font-poppins text-[#64748b]">
                                role: <Text className="font-poppins-semibold text-[#475569]">{tech.role}</Text>
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* 2. Contact Info */}
                        <View className="flex-[2] min-w-[200px] pr-2">
                          <View className="flex-row items-center">
                            <Ionicons
                              name="call-outline"
                              size={11}
                              color="#4d6029"
                            />
                            <Text
                              className="text-xs font-poppins-medium text-[#0f172a] ml-1.5"
                              numberOfLines={1}
                            >
                              {tech.phone}
                            </Text>
                          </View>
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons
                              name="mail-outline"
                              size={11}
                              color="#64748b"
                            />
                            <Text
                              className="text-[10px] font-poppins text-[#64748b] ml-1.5"
                              numberOfLines={1}
                            >
                              {tech.email}
                            </Text>
                          </View>
                        </View>

                        {/* 3. Last Box Scanned */}
                        <View className="flex-[2.8] min-w-[260px] pr-3">
                          <View className="flex-row items-center">
                            <View className="bg-[#0f172a] px-2 py-0.5 rounded-md mr-1.5">
                              <Text className="text-[10px] font-poppins-bold text-white">
                                {tech.lastBoxCode}
                              </Text>
                            </View>
                            <Text
                              className="text-xs font-poppins-bold text-[#0f172a] flex-1"
                              numberOfLines={1}
                            >
                              {tech.lastBoxName}
                            </Text>
                          </View>
                          <View className="flex-row items-center mt-1">
                            <Ionicons
                              name="time-outline"
                              size={11}
                              color="#64748b"
                            />
                            <Text className="text-[10px] font-poppins text-[#64748b] ml-1">
                              {tech.lastScanTime}
                            </Text>
                          </View>
                        </View>

                        {/* 4. Today's Activity */}
                        <View className="flex-[1.5] min-w-[150px] pr-2">
                          <View className="flex-row items-center">
                            <View className="w-6 h-6 rounded-full bg-slate-100 items-center justify-center mr-1.5 border border-slate-200">
                              <Text className="text-[11px] font-poppins-bold text-[#0f172a]">
                                {tech.todayScansCount}
                              </Text>
                            </View>
                            <Text className="text-[10px] font-poppins text-[#64748b]">
                              Scans Today
                            </Text>
                          </View>
                        </View>

                        {/* 5. Actions */}
                        <View className="w-[100px] min-w-[100px] flex-row items-center justify-end">
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedTechForDetails(tech);
                              setActiveDetailsTab("LOGS");
                            }}
                            className="bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg flex-row items-center shadow-xs"
                          >
                            <Ionicons
                              name="folder-open-outline"
                              size={12}
                              color="#ffffff"
                            />
                            <Text className="text-[10px] font-poppins-bold text-white ml-1">
                              Inspect
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
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
                      {filteredTechs.length === 0 ? 0 : startIndex + 1} -{" "}
                      {endIndex}
                    </Text>{" "}
                    of{" "}
                    <Text className="font-poppins-bold text-[#0f172a]">
                      {filteredTechs.length}
                    </Text>{" "}
                    technicians
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

                {/* Right: Previous / Next */}
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

      {/* INSPECTOR MODAL: DETAILED TECHNICIAN SCAN HISTORY & AUDIT LOGS */}
      {selectedTechForDetails && (
        <Modal
          visible={!!selectedTechForDetails}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTechForDetails(null)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-100 overflow-hidden flex-col">
              {/* Inspector Header */}
              <View className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-3.5 shadow-sm"
                    style={{ backgroundColor: selectedTechForDetails.avatarColor || '#4d6029' }}
                  >
                    <Text className="text-base font-poppins-bold text-white">
                      {selectedTechForDetails.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </Text>
                  </View>
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-base font-poppins-bold text-[#0f172a]">
                        {selectedTechForDetails.name}
                      </Text>
                      <View className="bg-slate-200 px-2 py-0.5 rounded-md ml-2">
                        <Text className="text-[10px] font-mono font-bold text-[#334155]">
                          role: {selectedTechForDetails.role}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-poppins text-[#64748b]">
                      {selectedTechForDetails.email} ·{" "}
                      {selectedTechForDetails.phone}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedTechForDetails(null)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Tab Switcher */}
              <View className="flex-row border-b border-slate-100 px-6 pt-3 bg-white">
                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("LOGS")}
                  className={`pb-3 mr-6 flex-row items-center border-b-2 ${
                    activeDetailsTab === "LOGS"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={15}
                    color={activeDetailsTab === "LOGS" ? "#4d6029" : "#94a3b8"}
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "LOGS"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Scan Boxes (
                    {selectedTechForDetails.scanHistory.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("ACTIONS")}
                  className={`pb-3 mr-6 flex-row items-center border-b-2 ${
                    activeDetailsTab === "ACTIONS"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <Ionicons
                    name="construct-outline"
                    size={15}
                    color={
                      activeDetailsTab === "ACTIONS" ? "#4d6029" : "#94a3b8"
                    }
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "ACTIONS"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Hardware Maintenance (
                    {selectedTechForDetails.maintenanceActions.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("DEVICE")}
                  className={`pb-3 flex-row items-center border-b-2 ${
                    activeDetailsTab === "DEVICE"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={15}
                    color={
                      activeDetailsTab === "DEVICE" ? "#4d6029" : "#94a3b8"
                    }
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "DEVICE"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Scanner Telemetry
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content Body */}
              <ScrollView className="p-6 flex-1 max-h-[50vh]">
                {/* 1. Scan Boxes Tab */}
                {activeDetailsTab === "LOGS" && (
                  <View>
                    {selectedTechForDetails.scanHistory.length === 0 ? (
                      <View className="py-10 items-center justify-center">
                        <MaterialCommunityIcons
                          name="qrcode-scan"
                          size={36}
                          color="#cbd5e1"
                        />
                        <Text className="text-xs font-poppins-medium text-[#94a3b8] mt-2">
                          No QR scan records found for this technician.
                        </Text>
                      </View>
                    ) : (
                      <View className="space-y-3">
                        {selectedTechForDetails.scanHistory.map((scan) => (
                          <View
                            key={scan.id}
                            className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 mb-2.5"
                          >
                            <View className="flex-row items-center justify-between mb-1">
                              <View className="flex-row items-center">
                                <View className="bg-[#0f172a] px-2.5 py-0.5 rounded-lg mr-2">
                                  <Text className="text-xs font-poppins-bold text-white">
                                    {scan.boxCode}
                                  </Text>
                                </View>
                                <Text className="text-xs font-poppins-bold text-[#0f172a]">
                                  {scan.siteName}
                                </Text>
                              </View>
                              <Text className="text-[10px] font-poppins text-[#64748b]">
                                {scan.timestamp}
                              </Text>
                            </View>

                            <Text className="text-[11px] font-poppins text-[#475569] mt-1 bg-white p-2.5 rounded-xl border border-slate-200/60">
                              💬 {scan.notes}
                            </Text>

                            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-200/50">
                              {scan.distanceMeters !== undefined &&
                              scan.distanceMeters !== null ? (
                                <View
                                  className={`px-2 py-0.5 rounded-full flex-row items-center ${
                                    scan.locationVerified
                                      ? "bg-emerald-50 border border-emerald-200"
                                      : "bg-rose-50 border border-rose-300"
                                  }`}
                                >
                                  <Ionicons
                                    name={
                                      scan.locationVerified
                                        ? "location"
                                        : "warning"
                                    }
                                    size={10}
                                    color={
                                      scan.locationVerified
                                        ? "#059669"
                                        : "#dc2626"
                                    }
                                  />
                                  <Text
                                    className={`text-[9px] font-poppins-bold ml-1 ${
                                      scan.locationVerified
                                        ? "text-emerald-700"
                                        : "text-rose-700"
                                    }`}
                                  >
                                    {scan.locationVerified
                                      ? `On-Site (${formatDistance(
                                          scan.distanceMeters
                                        )})`
                                      : `Mismatch (${formatDistance(
                                          scan.distanceMeters
                                        )})`}
                                  </Text>
                                </View>
                              ) : (
                                <View className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                  <Text className="text-[9px] font-poppins text-slate-500">
                                    GPS N/A
                                  </Text>
                                </View>
                              )}
                              <View
                                className={`px-2 py-0.5 rounded-md ${
                                  scan.status === "ALARM"
                                    ? "bg-rose-50"
                                    : scan.status === "MAINTENANCE_DONE"
                                    ? "bg-amber-50"
                                    : "bg-slate-100"
                                }`}
                              >
                                <Text
                                  className={`text-[9px] font-poppins-bold ${
                                    scan.status === "ALARM"
                                      ? "text-rose-700"
                                      : scan.status === "MAINTENANCE_DONE"
                                      ? "text-amber-700"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {scan.status}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* 2. Hardware Maintenance Tab */}
                {activeDetailsTab === "ACTIONS" && (
                  <View>
                    {selectedTechForDetails.maintenanceActions.length === 0 ? (
                      <View className="py-10 items-center justify-center">
                        <Ionicons
                          name="construct-outline"
                          size={36}
                          color="#cbd5e1"
                        />
                        <Text className="text-xs font-poppins-medium text-[#94a3b8] mt-2">
                          No pending maintenance tasks recorded.
                        </Text>
                      </View>
                    ) : (
                      <View className="space-y-2.5">
                        <View className="flex-row items-center justify-between pb-1 px-1 mb-1">
                          <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                            Servicing & Corrective History ({selectedTechForDetails.maintenanceActions.length})
                          </Text>
                          <View className="flex-row items-center gap-1.5">
                            {selectedTechForDetails.maintenanceActions.filter((a) => a.status === "PENDING").length > 0 && (
                              <View className="bg-rose-100 px-2 py-0.5 rounded-full">
                                <Text className="text-[10px] font-poppins-bold text-rose-700">
                                  {selectedTechForDetails.maintenanceActions.filter((a) => a.status === "PENDING").length} Pending
                                </Text>
                              </View>
                            )}
                            {selectedTechForDetails.maintenanceActions.filter((a) => a.status === "RESOLVED").length > 0 && (
                              <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                                <Text className="text-[10px] font-poppins-bold text-emerald-700">
                                  {selectedTechForDetails.maintenanceActions.filter((a) => a.status === "RESOLVED").length} Resolved
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {selectedTechForDetails.maintenanceActions.map(
                          (action) => (
                            <View
                              key={action.id}
                              className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex-row items-center justify-between mb-2"
                            >
                              <View className="flex-1 mr-3">
                                <View className="flex-row items-center mb-0.5">
                                  <View className="bg-slate-200 px-2 py-0.5 rounded-md mr-1.5">
                                    <Text className="text-[10px] font-mono font-bold text-[#334155]">
                                      {action.boxCode}
                                    </Text>
                                  </View>
                                  <Text className="text-xs font-poppins-bold text-[#0f172a]">
                                    {action.action}
                                  </Text>
                                </View>
                                <Text className="text-[10px] font-poppins text-[#64748b]">
                                  Logged Date: {action.date}
                                </Text>
                              </View>

                              <View
                                className={`px-2.5 py-1 rounded-lg ${
                                  action.status === "RESOLVED"
                                    ? "bg-emerald-100"
                                    : "bg-rose-100"
                                }`}
                              >
                                <Text
                                  className={`text-[10px] font-poppins-bold ${
                                    action.status === "RESOLVED"
                                      ? "text-emerald-800"
                                      : "text-rose-800"
                                  }`}
                                >
                                  {action.status}
                                </Text>
                              </View>
                            </View>
                          ),
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* 3. Scanner Device Telemetry Tab */}
                {activeDetailsTab === "DEVICE" && (
                  <View className="space-y-3">
                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                      <Text className="text-xs font-poppins-bold text-[#0f172a] mb-2.5">
                        Mobile Camera Scanner Device Diagnostics:
                      </Text>

                      <View className="grid grid-cols-2 gap-2 text-xs">
                        <View className="bg-white p-3 rounded-xl border border-slate-200">
                          <Text className="text-[10px] font-poppins text-[#64748b]">
                            Scanner Model
                          </Text>
                          <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
                            {selectedTechForDetails.deviceModel}
                          </Text>
                        </View>

                        <View className="bg-white p-3 rounded-xl border border-slate-200">
                          <Text className="text-[10px] font-poppins text-[#64748b]">
                            Mobile App Version
                          </Text>
                          <Text className="text-xs font-poppins-bold text-[#4d6029] mt-0.5">
                            {selectedTechForDetails.appVersion}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Inspector Footer Actions */}
              <View className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex-row items-center justify-end">
                <TouchableOpacity
                  onPress={() => setSelectedTechForDetails(null)}
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
