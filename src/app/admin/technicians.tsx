import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface ScanLogEntry {
  id: string;
  boxCode: string;
  siteName: string;
  timestamp: string;
  status: "NORMAL" | "ALARM" | "MAINTENANCE_DONE";
  notes: string;
}

export interface MaintenanceAction {
  id: string;
  boxCode: string;
  action: string;
  date: string;
  status: "RESOLVED" | "PENDING";
}

export interface Technician {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  avatarBg: string;
  phone: string;
  email: string;
  dutyStatus: "ON_DUTY" | "ON_BREAK" | "OFF_DUTY";
  lastBoxCode: string;
  lastBoxName: string;
  lastScanTime: string;
  todayScansCount: number;
  totalScansThisMonth: number;
  activeAlarmsCount: number;
  appVersion: string;
  deviceModel: string;
  lastBatteryLevel: string;
  scanHistory: ScanLogEntry[];
  maintenanceActions: MaintenanceAction[];
}

const STATIC_TECHNICIANS: Technician[] = [
  {
    id: "1",
    employeeId: "TECH-ILG-01",
    name: "Alex Davies",
    role: "Lead Optical Fiber Splicer",
    avatarBg: "bg-[#4d6029]",
    phone: "+63 917 882 1091",
    email: "alex.davies@multifactors.ph",
    dutyStatus: "ON_DUTY",
    lastBoxCode: "DB-MN-01",
    lastBoxName: "Iligan City Hall / Aguinaldo Central Hub",
    lastScanTime: "Today at 09:15 AM",
    todayScansCount: 8,
    totalScansThisMonth: 142,
    activeAlarmsCount: 0,
    appVersion: "v2.4.0 (Build 58)",
    deviceModel: "Samsung Galaxy A54 5G",
    lastBatteryLevel: "88%",
    scanHistory: [
      {
        id: "s1",
        boxCode: "DB-MN-01",
        siteName: "Iligan City Hall / Aguinaldo Central Hub",
        timestamp: "Today at 09:15 AM",
        status: "NORMAL",
        notes:
          "Routine morning inspection. Optical power on Feeder 1 tested nominal at -17.8 dBm.",
      },
      {
        id: "s2",
        boxCode: "DB-SB-03",
        siteName: "Tubod Commercial Distribution Node",
        timestamp: "Today at 08:30 AM",
        status: "NORMAL",
        notes:
          "Cleaned dust from splitter cassette. All 18 subscriber ports operating nominally.",
      },
      {
        id: "s3",
        boxCode: "DB-SB-02",
        siteName: "MSU-IIT Tibanga Campus Node",
        timestamp: "Yesterday at 04:10 PM",
        status: "MAINTENANCE_DONE",
        notes:
          "Re-spliced port 5 drop cable for university dorm hub. Power recovered to -16.2 dBm.",
      },
    ],
    maintenanceActions: [
      {
        id: "m1",
        boxCode: "DB-SB-02",
        action: "Re-spliced Port 05 drop cable connector",
        date: "Sep 30, 2026",
        status: "RESOLVED",
      },
      {
        id: "m2",
        boxCode: "DB-MN-01",
        action: "Annual optical patch panel laser calibration",
        date: "Sep 24, 2026",
        status: "RESOLVED",
      },
    ],
  },
  {
    id: "2",
    employeeId: "TECH-ILG-02",
    name: "Roberto Santos",
    role: "Senior Maintenance Lineman",
    avatarBg: "bg-sky-700",
    phone: "+63 928 441 2099",
    email: "roberto.santos@multifactors.ph",
    dutyStatus: "ON_DUTY",
    lastBoxCode: "DB-SB-04",
    lastBoxName: "Robinsons Place Iligan - Floor 2 Rack",
    lastScanTime: "Today at 10:40 AM",
    todayScansCount: 6,
    totalScansThisMonth: 118,
    activeAlarmsCount: 0,
    appVersion: "v2.4.0 (Build 58)",
    deviceModel: "Xiaomi Redmi Note 13 Pro",
    lastBatteryLevel: "74%",
    scanHistory: [
      {
        id: "s4",
        boxCode: "DB-SB-04",
        siteName: "Robinsons Place Iligan - Floor 2 Rack",
        timestamp: "Today at 10:40 AM",
        status: "NORMAL",
        notes:
          "Checked rack cabinet seals and breaker temperature. Verified POS ports.",
      },
      {
        id: "s5",
        boxCode: "DB-MN-02",
        siteName: "Aguinaldo Secondary Distribution Center",
        timestamp: "Today at 09:00 AM",
        status: "NORMAL",
        notes: "Secondary hub morning telemetry verified. 28/32 ports active.",
      },
    ],
    maintenanceActions: [
      {
        id: "m3",
        boxCode: "DB-SB-04",
        action: "Installed 20A DIN-rail breaker backup",
        date: "Sep 28, 2026",
        status: "RESOLVED",
      },
    ],
  },
  {
    id: "3",
    employeeId: "TECH-ILG-03",
    name: "Maria Gonzales",
    role: "Field Network Specialist",
    avatarBg: "bg-emerald-700",
    phone: "+63 919 332 9011",
    email: "maria.gonzales@multifactors.ph",
    dutyStatus: "ON_BREAK",
    lastBoxCode: "DB-SB-02",
    lastBoxName: "MSU-IIT Tibanga Campus Node",
    lastScanTime: "1 hour ago",
    todayScansCount: 5,
    totalScansThisMonth: 96,
    activeAlarmsCount: 0,
    appVersion: "v2.4.0 (Build 58)",
    deviceModel: "Samsung Galaxy S22",
    lastBatteryLevel: "62%",
    scanHistory: [
      {
        id: "s6",
        boxCode: "DB-SB-02",
        siteName: "MSU-IIT Tibanga Campus Node",
        timestamp: "1 hour ago",
        status: "NORMAL",
        notes:
          "Midday fiber attenuation scan on Slot B. Clean signal across academic links.",
      },
    ],
    maintenanceActions: [],
  },
  {
    id: "4",
    employeeId: "TECH-ILG-04",
    name: "Juan Dela Cruz",
    role: "Emergency Dispatch Lineman",
    avatarBg: "bg-rose-700",
    phone: "+63 915 771 4022",
    email: "juan.delacruz@multifactors.ph",
    dutyStatus: "OFF_DUTY",
    lastBoxCode: "DB-SB-06",
    lastBoxName: "Del Carmen Secondary Sub-Box",
    lastScanTime: "Yesterday at 04:30 PM",
    todayScansCount: 0,
    totalScansThisMonth: 84,
    activeAlarmsCount: 1,
    appVersion: "v2.3.8 (Build 55)",
    deviceModel: "Realme 11 Pro",
    lastBatteryLevel: "45%",
    scanHistory: [
      {
        id: "s7",
        boxCode: "DB-SB-06",
        siteName: "Del Carmen Secondary Sub-Box",
        timestamp: "Yesterday at 04:30 PM",
        status: "ALARM",
        notes:
          "ALARM TRIGGERED: Detected elevated temperature (58°C) on primary 20A breaker.",
      },
    ],
    maintenanceActions: [
      {
        id: "m4",
        boxCode: "DB-SB-06",
        action: "Investigate and replace degraded 1:8 PLC splitter slot",
        date: "Oct 01, 2026",
        status: "PENDING",
      },
    ],
  },
  {
    id: "5",
    employeeId: "TECH-ILG-05",
    name: "Carlo Mendoza",
    role: "Optical Fiber Splicer",
    avatarBg: "bg-indigo-700",
    phone: "+63 930 114 8871",
    email: "carlo.mendoza@multifactors.ph",
    dutyStatus: "ON_DUTY",
    lastBoxCode: "DB-MN-02",
    lastBoxName: "Aguinaldo Secondary Distribution Center",
    lastScanTime: "Today at 11:20 AM",
    todayScansCount: 4,
    totalScansThisMonth: 104,
    activeAlarmsCount: 0,
    appVersion: "v2.4.0 (Build 58)",
    deviceModel: "Oppo Reno 10",
    lastBatteryLevel: "81%",
    scanHistory: [
      {
        id: "s8",
        boxCode: "DB-MN-02",
        siteName: "Aguinaldo Secondary Distribution Center",
        timestamp: "Today at 11:20 AM",
        status: "NORMAL",
        notes:
          "Midday link inspection. All commercial fiber lines functioning properly.",
      },
    ],
    maintenanceActions: [],
  },
  {
    id: "6",
    employeeId: "TECH-ILG-06",
    name: "Dennis Villanueva",
    role: "Optical Network Specialist",
    avatarBg: "bg-teal-700",
    phone: "+63 947 552 1104",
    email: "dennis.v@multifactors.ph",
    dutyStatus: "ON_DUTY",
    lastBoxCode: "DB-SB-03",
    lastBoxName: "Tubod Commercial Distribution Node",
    lastScanTime: "Today at 08:50 AM",
    todayScansCount: 7,
    totalScansThisMonth: 130,
    activeAlarmsCount: 0,
    appVersion: "v2.4.0 (Build 58)",
    deviceModel: "Samsung Galaxy A34",
    lastBatteryLevel: "92%",
    scanHistory: [
      {
        id: "s9",
        boxCode: "DB-SB-03",
        siteName: "Tubod Commercial Distribution Node",
        timestamp: "Today at 08:50 AM",
        status: "NORMAL",
        notes:
          "Morning circuit breaker inspection and terminal block continuity test.",
      },
    ],
    maintenanceActions: [],
  },
  {
    id: "7",
    employeeId: "TECH-ILG-07",
    name: "Grace Alcantara",
    role: "Field QA & Compliance Officer",
    avatarBg: "bg-amber-700",
    phone: "+63 918 663 8812",
    email: "grace.alcantara@multifactors.ph",
    dutyStatus: "ON_DUTY",
    lastBoxCode: "DB-SB-05",
    lastBoxName: "Tambo Terminal Distribution Enclosure",
    lastScanTime: "Today at 11:45 AM",
    todayScansCount: 5,
    totalScansThisMonth: 112,
    activeAlarmsCount: 0,
    appVersion: "v2.4.0 (Build 58)",
    deviceModel: "iPhone 14",
    lastBatteryLevel: "85%",
    scanHistory: [
      {
        id: "s10",
        boxCode: "DB-SB-05",
        siteName: "Tambo Terminal Distribution Enclosure",
        timestamp: "Today at 11:45 AM",
        status: "NORMAL",
        notes:
          "Conducted pre-affix inspection for pending 50x50mm QR door sticker.",
      },
    ],
    maintenanceActions: [],
  },
  {
    id: "8",
    employeeId: "TECH-ILG-08",
    name: "Mark Anthony Ramos",
    role: "Field Lineman Apprentice",
    avatarBg: "bg-slate-700",
    phone: "+63 922 990 4431",
    email: "mark.ramos@multifactors.ph",
    dutyStatus: "OFF_DUTY",
    lastBoxCode: "DB-MN-01",
    lastBoxName: "Iligan City Hall / Aguinaldo Central Hub",
    lastScanTime: "Yesterday at 05:10 PM",
    todayScansCount: 0,
    totalScansThisMonth: 62,
    activeAlarmsCount: 0,
    appVersion: "v2.4.0 (Build 58)",
    deviceModel: "Vivo V29",
    lastBatteryLevel: "50%",
    scanHistory: [],
    maintenanceActions: [],
  },
];

type DutyFilter = "ALL" | "ON_DUTY" | "ON_BREAK" | "OFF_DUTY" | "HAS_ALARM";

export default function TechniciansScreen() {
  const [technicians] = useState<Technician[]>(STATIC_TECHNICIANS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<DutyFilter>("ALL");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      tech.employeeId.toLowerCase().includes(query) ||
      tech.role.toLowerCase().includes(query) ||
      tech.phone.toLowerCase().includes(query) ||
      tech.lastBoxCode.toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (activeFilter === "ON_DUTY") return tech.dutyStatus === "ON_DUTY";
    if (activeFilter === "ON_BREAK") return tech.dutyStatus === "ON_BREAK";
    if (activeFilter === "OFF_DUTY") return tech.dutyStatus === "OFF_DUTY";
    if (activeFilter === "HAS_ALARM") return tech.activeAlarmsCount > 0;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTechs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTechs.length);
  const paginatedTechs = filteredTechs.slice(startIndex, endIndex);

  const getDutyBadge = (status: Technician["dutyStatus"]) => {
    switch (status) {
      case "ON_DUTY":
        return {
          bg: "bg-emerald-50 border border-emerald-200",
          dot: "bg-emerald-500",
          text: "text-emerald-700",
          label: "On-Duty (Field)",
        };
      case "ON_BREAK":
        return {
          bg: "bg-amber-50 border border-amber-200",
          dot: "bg-amber-500",
          text: "text-amber-800",
          label: "On Break",
        };
      case "OFF_DUTY":
        return {
          bg: "bg-slate-100 border border-slate-200",
          dot: "bg-slate-400",
          text: "text-slate-600",
          label: "Off-Duty",
        };
    }
  };

  const onDutyCount = technicians.filter(
    (t) => t.dutyStatus === "ON_DUTY",
  ).length;
  const totalScansToday = technicians.reduce(
    (acc, t) => acc + t.todayScansCount,
    0,
  );
  const totalAlarmsCount = technicians.reduce(
    (acc, t) => acc + t.activeAlarmsCount,
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
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
                  Monitor on-duty field personnel, track real-time QR scan
                  telemetry, and audit maintenance visits.
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center space-x-2.5">
                <TouchableOpacity
                  onPress={() => router.push("/admin/dashboard")}
                  className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm mr-2"
                  activeOpacity={0.8}
                >
                  <Ionicons name="map-outline" size={16} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    View Live Map
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 1. TOP ROW OF 4 SUMMARY METRIC CARDS */}
            <View className="flex-row flex-wrap -mx-2 mb-5">
              {/* Card 1: Active Field Personnel */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Active Field Team
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
                      <Ionicons name="person" size={16} color="#059669" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {onDutyCount} / {technicians.length}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Text className="text-[10px] font-poppins-bold text-emerald-700">
                        {Math.round((onDutyCount / technicians.length) * 100)}%
                        On-Duty
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    6 Technicians Active in Field
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
                        +18% Today
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
                        Urgent Action
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Assigned to DB-SB-06 (Del Carmen)
                  </Text>
                </View>
              </View>

              {/* Card 4: Average Response Time */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Average Response Time
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-sky-50 items-center justify-center border border-sky-100">
                      <Ionicons
                        name="speedometer-outline"
                        size={16}
                        color="#0284c7"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      18m
                    </Text>
                    <View className="bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      <Text className="text-[10px] font-poppins-bold text-sky-700">
                        Fast SLA
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    From Alert to Physical QR Scan
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
                  placeholder="Search by technician name, ID (e.g. TECH-ILG-01), role, or phone..."
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
                  { id: "ON_DUTY", label: `🟢 On-Duty (${onDutyCount})` },
                  { id: "ON_BREAK", label: "🟡 On Break (1)" },
                  { id: "OFF_DUTY", label: "🔴 Off-Duty (2)" },
                  { id: "HAS_ALARM", label: "⚠️ Alarms (1)" },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => {
                      setActiveFilter(filter.id as DutyFilter);
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
                    <View className="flex-[2] min-w-[220px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Technician & Role
                      </Text>
                    </View>
                    <View className="flex-[1.8] min-w-[180px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Contact Info
                      </Text>
                    </View>
                    <View className="flex-[1.3] min-w-[140px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Duty Status
                      </Text>
                    </View>
                    <View className="flex-[2.2] min-w-[220px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Last Box Scanned
                      </Text>
                    </View>
                    <View className="flex-[1.2] min-w-[120px] pr-2">
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
                  {paginatedTechs.map((tech, index) => {
                    const dutyMeta = getDutyBadge(tech.dutyStatus);

                    return (
                      <View
                        key={tech.id}
                        className={`flex-row items-center px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors w-full ${
                          index % 2 === 1 ? "bg-[#fafbfc]" : "bg-white"
                        }`}
                      >
                        {/* 1. Technician & Role */}
                        <View className="flex-[2] min-w-[220px] pr-2 flex-row items-center">
                          <View
                            className={`w-10 h-10 rounded-2xl ${tech.avatarBg} items-center justify-center mr-3 shadow-xs`}
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
                              <Text className="text-[10px] font-mono font-semibold text-[#4d6029] mr-1.5">
                                {tech.employeeId}
                              </Text>
                              <Text
                                className="text-[10px] font-poppins text-[#64748b]"
                                numberOfLines={1}
                              >
                                · {tech.role}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* 2. Contact Info */}
                        <View className="flex-[1.8] min-w-[180px] pr-2">
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

                        {/* 3. Duty Status */}
                        <View className="flex-[1.3] min-w-[140px] pr-2">
                          <View
                            className={`inline-flex self-start px-2.5 py-1 rounded-lg flex-row items-center ${dutyMeta.bg}`}
                          >
                            <View
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dutyMeta.dot}`}
                            />
                            <Text
                              className={`text-[10px] font-poppins-bold ${dutyMeta.text}`}
                            >
                              {dutyMeta.label}
                            </Text>
                          </View>
                        </View>

                        {/* 4. Last Box Scanned */}
                        <View className="flex-[2.2] min-w-[220px] pr-3">
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

                        {/* 5. Today's Activity */}
                        <View className="flex-[1.2] min-w-[120px] pr-2">
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

                        {/* 6. Actions */}
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
                    );
                  })}
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
                    className={`w-12 h-12 rounded-2xl ${selectedTechForDetails.avatarBg} items-center justify-center mr-3.5 shadow-sm`}
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
                          {selectedTechForDetails.employeeId}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-poppins text-[#64748b]">
                      {selectedTechForDetails.role} ·{" "}
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
                    name="history"
                    size={16}
                    color={activeDetailsTab === "LOGS" ? "#4d6029" : "#94a3b8"}
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "LOGS"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Scan Audit Trail (
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
                {/* 1. Scan Audit Trail Tab */}
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

                        <View className="bg-white p-3 rounded-xl border border-slate-200">
                          <Text className="text-[10px] font-poppins text-[#64748b]">
                            Battery Level
                          </Text>
                          <Text className="text-xs font-poppins-bold text-emerald-700 mt-0.5">
                            🔋 {selectedTechForDetails.lastBatteryLevel}
                          </Text>
                        </View>

                        <View className="bg-white p-3 rounded-xl border border-slate-200">
                          <Text className="text-[10px] font-poppins text-[#64748b]">
                            Monthly Scans
                          </Text>
                          <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
                            {selectedTechForDetails.totalScansThisMonth} Boxes
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
