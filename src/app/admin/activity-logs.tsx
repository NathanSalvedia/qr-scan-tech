import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
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

export type EventCategory =
  | "SCAN"
  | "ALARM"
  | "BOX_UPDATE"
  | "PRINT"
  | "PORT_CHANGE";

export interface AuditLogItem {
  id: string;
  timestamp: string;
  relativeTime: string;
  category: EventCategory;
  actorType: "TECHNICIAN" | "ADMIN" | "SYSTEM";
  actorName: string;
  actorId?: string;
  targetBoxCode: string;
  targetBoxName: string;
  title: string;
  description: string;
  deviceOrIp: string;
  gpsCoordinates?: string;
  metadata?: Record<string, string>;
}

const STATIC_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "LOG-20261001-001",
    timestamp: "Oct 01, 2026 · 11:45 AM",
    relativeTime: "15m ago",
    category: "SCAN",
    actorType: "TECHNICIAN",
    actorName: "Grace Alcantara",
    actorId: "TECH-ILG-07",
    targetBoxCode: "DB-SB-05",
    targetBoxName: "Tambo Terminal Distribution Enclosure",
    title: "Physical QR Scan & Verification",
    description:
      "Conducted pre-affix inspection for pending 50x50mm QR door sticker. Splitter cassette seals verified intact.",
    deviceOrIp: "iPhone 14 (Scanner v2.4.0)",
    gpsCoordinates: "8.2490° N, 124.2610° E (±4m)",
    metadata: {
      "Signal Quality": "Nominal (-17.4 dBm)",
      "Cabinet Status": "Closed & Padlocked",
      "QR Token Read": "QRTECH-BOX-SB05-6612",
    },
  },
  {
    id: "LOG-20261001-002",
    timestamp: "Oct 01, 2026 · 11:20 AM",
    relativeTime: "40m ago",
    category: "SCAN",
    actorType: "TECHNICIAN",
    actorName: "Carlo Mendoza",
    actorId: "TECH-ILG-05",
    targetBoxCode: "DB-MN-02",
    targetBoxName: "Aguinaldo Secondary Distribution Center",
    title: "Routine Hub Telemetry Scan",
    description:
      "Midday link inspection. All 28 commercial active subscriber ports functioning nominally with zero packet drops.",
    deviceOrIp: "Oppo Reno 10 (Scanner v2.4.0)",
    gpsCoordinates: "8.2238° N, 124.2458° E (±2m)",
    metadata: {
      "Active Ports": "28 / 32 Occupied",
      "Optical Feeder": "Main Feeder 24-Port",
      "QR Token Read": "QRTECH-BOX-MN02-4412",
    },
  },
  {
    id: "LOG-20261001-003",
    timestamp: "Oct 01, 2026 · 10:55 AM",
    relativeTime: "1h ago",
    category: "PRINT",
    actorType: "ADMIN",
    actorName: "Super Admin (NOC Console)",
    actorId: "ADMIN-01",
    targetBoxCode: "DB-SB-04 & DB-SB-05",
    targetBoxName: "Robinsons Place & Tambo Terminal",
    title: "A4 QR Sheet Print Job Generated",
    description:
      "Batch formatted standard A4 bondpaper sheet containing 2 QR placards (DB-SB-04 and DB-SB-05) for field dispatch.",
    deviceOrIp: "Web Console (192.168.1.104)",
    metadata: {
      "Paper Size": "A4 Bondpaper (210x297mm)",
      "Placards Per Sheet": "2 Placards (Center Cut Guide)",
      "Dispatch Route": "Zone 3 & Zone 4 Courier",
    },
  },
  {
    id: "LOG-20261001-004",
    timestamp: "Oct 01, 2026 · 10:40 AM",
    relativeTime: "1h 20m ago",
    category: "SCAN",
    actorType: "TECHNICIAN",
    actorName: "Roberto Santos",
    actorId: "TECH-ILG-02",
    targetBoxCode: "DB-SB-04",
    targetBoxName: "Robinsons Place Iligan - Floor 2 Rack",
    title: "Physical QR Scan & Rack Check",
    description:
      "Checked rack cabinet seals, ambient temperature, and breaker voltage. Verified Robinsons Supermarket POS fiber feed.",
    deviceOrIp: "Xiaomi Redmi Note 13 Pro",
    gpsCoordinates: "8.2205° N, 124.2385° E (±5m)",
    metadata: {
      "Enclosure Temp": "26.4°C (Optimal)",
      Subscribers: "3 Enterprise Clients Online",
      "QR Token Read": "QRTECH-BOX-SB04-7731",
    },
  },
  {
    id: "LOG-20261001-005",
    timestamp: "Oct 01, 2026 · 09:30 AM",
    relativeTime: "2h 30m ago",
    category: "PORT_CHANGE",
    actorType: "ADMIN",
    actorName: "Network Provisioning Officer",
    actorId: "ADMIN-PROV",
    targetBoxCode: "DB-MN-01",
    targetBoxName: "Iligan City Hall / Aguinaldo Central Hub",
    title: "Subscriber Port Provisioned",
    description:
      "Assigned Port 04 to Iligan Public Library Node (ACC-ILG-004 · 300 Mbps Fiber Dedicated Link).",
    deviceOrIp: "Web Console (192.168.1.110)",
    metadata: {
      "Port Assigned": "Port 04",
      "Subscriber ID": "ACC-ILG-004",
      "Bandwidth Plan": "300 Mbps Fiber",
    },
  },
  {
    id: "LOG-20261001-006",
    timestamp: "Oct 01, 2026 · 09:15 AM",
    relativeTime: "2h 45m ago",
    category: "SCAN",
    actorType: "TECHNICIAN",
    actorName: "Alex Davies",
    actorId: "TECH-ILG-01",
    targetBoxCode: "DB-MN-01",
    targetBoxName: "Iligan City Hall / Aguinaldo Central Hub",
    title: "Central Hub Morning Inspection",
    description:
      "Routine morning physical QR scan. Optical feeder tested nominal at -17.8 dBm. Primary 63A breaker operating within normal parameters.",
    deviceOrIp: "Samsung Galaxy A54 5G",
    gpsCoordinates: "8.2285° N, 124.2415° E (±3m)",
    metadata: {
      "Signal Level": "-17.8 dBm (Pass)",
      "Breaker Temp": "31.2°C (Pass)",
      "QR Token Read": "QRTECH-BOX-MN01-8891",
    },
  },
  {
    id: "LOG-20261001-007",
    timestamp: "Oct 01, 2026 · 08:30 AM",
    relativeTime: "3h 30m ago",
    category: "BOX_UPDATE",
    actorType: "ADMIN",
    actorName: "Super Admin",
    actorId: "ADMIN-01",
    targetBoxCode: "DB-SB-07",
    targetBoxName: "Suarez Terminal Secondary Node",
    title: "New Distribution Box Registered",
    description:
      "Registered new 24-port optical sub-box DB-SB-07 under upstream feeder DB-MN-01. Generated unique cryptographic QR security token.",
    deviceOrIp: "Web Console (192.168.1.104)",
    metadata: {
      "Box Classification": "Sub-Distribution Box (24 Ports)",
      "Feeder Parent": "DB-MN-01",
      "Generated Token": "QRTECH-BOX-SB07-9914",
    },
  },
  {
    id: "LOG-20261001-008",
    timestamp: "Sep 30, 2026 · 04:30 PM",
    relativeTime: "Yesterday",
    category: "ALARM",
    actorType: "SYSTEM",
    actorName: "Hardware Telemetry Daemon",
    targetBoxCode: "DB-SB-06",
    targetBoxName: "Del Carmen Secondary Sub-Box",
    title: "High Temperature & Attenuation Alert",
    description:
      "ALARM TRIGGERED: DIN-rail breaker temperature exceeded 58°C threshold and optical attenuation detected on Port 03 splitter output.",
    deviceOrIp: "Telemetry Sensor Node #88",
    metadata: {
      "Alert Severity": "CRITICAL / HARDWARE ALARM",
      "Sensor Reading": "58.4°C on Breaker 20A",
      "Assigned Lineman": "Juan Dela Cruz (TECH-ILG-04)",
    },
  },
  {
    id: "LOG-20261001-009",
    timestamp: "Sep 30, 2026 · 04:10 PM",
    relativeTime: "Yesterday",
    category: "SCAN",
    actorType: "TECHNICIAN",
    actorName: "Alex Davies",
    actorId: "TECH-ILG-01",
    targetBoxCode: "DB-SB-02",
    targetBoxName: "MSU-IIT Tibanga Campus Node",
    title: "Field Maintenance Re-splice Scan",
    description:
      "Completed re-splicing of Port 05 drop cable feeding the MSU-IIT dormitory hub. Optical power recovered to -16.2 dBm.",
    deviceOrIp: "Samsung Galaxy A54 5G",
    gpsCoordinates: "8.2415° N, 124.2440° E (±2m)",
    metadata: {
      "Action Taken": "Drop cable re-splice",
      "Power Recovery": "-16.2 dBm",
      "QR Token Read": "QRTECH-BOX-SB02-9901",
    },
  },
  {
    id: "LOG-20261001-010",
    timestamp: "Sep 30, 2026 · 02:15 PM",
    relativeTime: "Yesterday",
    category: "PRINT",
    actorType: "ADMIN",
    actorName: "Super Admin",
    actorId: "ADMIN-01",
    targetBoxCode: "DB-MN-01 & DB-MN-02",
    targetBoxName: "Aguinaldo Central & Secondary Hub",
    title: "A4 Thermal QR Sheet Exported",
    description:
      "Exported printable A4 bondpaper sheet for Central Hub replacements with weather-resistant laminate guidelines.",
    deviceOrIp: "Web Console (192.168.1.104)",
    metadata: {
      "Export Format": "A4 PDF Sheet (2 Placards)",
      Status: "Completed",
    },
  },
  {
    id: "LOG-20261001-011",
    timestamp: "Sep 29, 2026 · 03:20 PM",
    relativeTime: "2 days ago",
    category: "BOX_UPDATE",
    actorType: "ADMIN",
    actorName: "Network Planning Team",
    actorId: "ADMIN-PLAN",
    targetBoxCode: "DB-SB-03",
    targetBoxName: "Tubod Commercial Distribution Node",
    title: "Splitter Configuration Updated",
    description:
      "Added 1:8 PLC optical splitter cassette to slot B, increasing distribution capacity from 16 to 24 ports.",
    deviceOrIp: "Web Console (192.168.1.109)",
    metadata: {
      "Old Capacity": "16 Ports",
      "New Capacity": "24 Ports",
    },
  },
  {
    id: "LOG-20261001-012",
    timestamp: "Sep 29, 2026 · 11:00 AM",
    relativeTime: "2 days ago",
    category: "ALARM",
    actorType: "SYSTEM",
    actorName: "Telemetry Gateway",
    targetBoxCode: "DB-SB-03",
    targetBoxName: "Tubod Commercial Distribution Node",
    title: "Enclosure Door Intrusion Triggered",
    description:
      "Door contact sensor triggered without active technician scanner authorization. Auto-cleared after verified lineman scan.",
    deviceOrIp: "Gateway IoT #12",
    metadata: {
      Severity: "WARNING (Resolved)",
      "Resolved By": "Dennis Villanueva (TECH-ILG-06)",
    },
  },
];

type CategoryFilter =
  | "ALL"
  | "SCAN"
  | "ALARM"
  | "BOX_UPDATE"
  | "PRINT"
  | "PORT_CHANGE";

export default function ActivityLogsScreen() {
  const [logs] = useState<AuditLogItem[]>(STATIC_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<CategoryFilter>("ALL");
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
    }
  };

  const handleExportLogs = () => {
    if (isWeb) {
      window.alert("Audit Log Export: Generated CSV report with 12 records.");
    } else {
      Alert.alert("Audit Log Export", "Generated CSV report with 12 records.");
    }
  };

  const scanCount = logs.filter((l) => l.category === "SCAN").length;
  const alarmCount = logs.filter((l) => l.category === "ALARM").length;
  const updateCount = logs.filter(
    (l) => l.category === "BOX_UPDATE" || l.category === "PORT_CHANGE",
  ).length;
  const printCount = logs.filter((l) => l.category === "PRINT").length;

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
                  onPress={handleExportLogs}
                  className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm mr-2"
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    Export Audit Log
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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
                    Across 7 Zones in Iligan
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
                    On-Site Field Maintenance
                  </Text>
                </View>
              </View>

              {/* Card 3: Hardware Alarms */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border-2 border-rose-500/30 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Hardware Alarms
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center border border-rose-200">
                      <Ionicons name="alert-circle" size={16} color="#dc2626" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {alarmCount}
                    </Text>
                    <View className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <Text className="text-[10px] font-poppins-bold text-rose-700">
                        1 Active Fault
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    DB-SB-06 High Temp Alert
                  </Text>
                </View>
              </View>

              {/* Card 4: Config & Print Jobs */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Config & Prints
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center border border-amber-200">
                      <MaterialCommunityIcons
                        name="printer"
                        size={16}
                        color="#d97706"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {updateCount + printCount}
                    </Text>
                    <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Text className="text-[10px] font-poppins-bold text-amber-800">
                        {printCount} Print Batches
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Enclosures & Stickers Issued
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
                  { id: "BOX_UPDATE", label: "📦 Updates" },
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
                  {paginatedLogs.map((item, index) => {
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
                            <View className="bg-[#0f172a] px-2 py-0.5 rounded-md mr-1.5">
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
                      Target Enclosure
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
                      Actor / Operator
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
