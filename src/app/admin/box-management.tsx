import { SidebarNavigation } from "@/components/sidebar-navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
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

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  serial: string;
  status: "OPERATIONAL" | "FAULTY" | "SPARE";
}

export interface ClientConnection {
  port: string;
  accountNumber: string;
  name: string;
  plan: string;
  status: "CONNECTED" | "DISCONNECTED";
}

export interface DistributionBox {
  id: string;
  code: string;
  category: "MAIN_BOX" | "SUB_BOX";
  parentCode?: string;
  siteName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE" | "NEEDS_TAG" | "ISSUE";
  totalPorts: number;
  activePorts: number;
  equipment: EquipmentItem[];
  clients: ClientConnection[];
  qrToken: string;
  lastScanned?: string;
  notes?: string;
}

const INITIAL_BOXES: DistributionBox[] = [
  {
    id: "1",
    code: "DB-MN-01",
    category: "MAIN_BOX",
    siteName: "Iligan City Hall / Aguinaldo Central Hub",
    address: "Aguinaldo St, Poblacion, Iligan City",
    latitude: 8.2285,
    longitude: 124.2415,
    status: "ACTIVE",
    totalPorts: 48,
    activePorts: 42,
    qrToken: "QRTECH-BOX-ILG-MN01-8891",
    lastScanned: "Today at 09:15 AM by Alex Davies",
    notes: "Primary optical distribution hub feeding 4 downstream sub-boxes.",
    equipment: [
      {
        id: "eq1",
        name: "Main Optical Feeder 48-Port",
        type: "Patch Panel",
        serial: "SN-OFP-4801",
        status: "OPERATIONAL",
      },
      {
        id: "eq2",
        name: "Primary Circuit Breaker 63A",
        type: "Breaker",
        serial: "SN-CB-63A-09",
        status: "OPERATIONAL",
      },
      {
        id: "eq3",
        name: "Surge Protection Device 40kA",
        type: "Surge Protector",
        serial: "SN-SPD-40K",
        status: "OPERATIONAL",
      },
    ],
    clients: [
      {
        port: "Port 01",
        accountNumber: "ACC-ILG-001",
        name: "City Hall Mayor Office",
        plan: "1 Gbps Enterprise Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 02",
        accountNumber: "ACC-ILG-002",
        name: "City Engineering Dept",
        plan: "500 Mbps Business Pro",
        status: "CONNECTED",
      },
      {
        port: "Port 03",
        accountNumber: "ACC-ILG-003",
        name: "Disaster Risk Management (DRRM)",
        plan: "1 Gbps Priority Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 04",
        accountNumber: "ACC-ILG-004",
        name: "Iligan Public Library Node",
        plan: "300 Mbps Fiber",
        status: "CONNECTED",
      },
    ],
  },
  {
    id: "2",
    code: "DB-MN-02",
    category: "MAIN_BOX",
    siteName: "Aguinaldo Secondary Distribution Center",
    address: "Roxas Ave cor. Aguinaldo, Iligan City",
    latitude: 8.2238,
    longitude: 124.2458,
    status: "ACTIVE",
    totalPorts: 32,
    activePorts: 28,
    qrToken: "QRTECH-BOX-ILG-MN02-4412",
    lastScanned: "Yesterday at 03:40 PM by R. Santos",
    notes: "Sub-hub routing feeder to Robinsons and Del Carmen sub-boxes.",
    equipment: [
      {
        id: "eq4",
        name: "Main Optical Feeder 24-Port",
        type: "Patch Panel",
        serial: "SN-OFP-2402",
        status: "OPERATIONAL",
      },
      {
        id: "eq5",
        name: "Primary Circuit Breaker 40A",
        type: "Breaker",
        serial: "SN-CB-40A-02",
        status: "OPERATIONAL",
      },
    ],
    clients: [
      {
        port: "Port 01",
        accountNumber: "ACC-ILG-010",
        name: "Roxas Commercial Bank",
        plan: "500 Mbps Dedicated",
        status: "CONNECTED",
      },
      {
        port: "Port 02",
        accountNumber: "ACC-ILG-011",
        name: "Poblacion Medical Clinic",
        plan: "300 Mbps Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 03",
        accountNumber: "ACC-ILG-012",
        name: "Midtown Plaza Office",
        plan: "200 Mbps Business",
        status: "CONNECTED",
      },
    ],
  },
  {
    id: "3",
    code: "DB-SB-02",
    category: "SUB_BOX",
    parentCode: "DB-MN-01",
    siteName: "MSU-IIT Tibanga Campus Node",
    address: "Andres Bonifacio Ave, Tibanga, Iligan City",
    latitude: 8.2415,
    longitude: 124.244,
    status: "ACTIVE",
    totalPorts: 32,
    activePorts: 24,
    qrToken: "QRTECH-BOX-ILG-SB02-9901",
    lastScanned: "Sep 29, 2026 by Alex Davies",
    notes: "Campus node with 1:8 splitters supplying academic buildings.",
    equipment: [
      {
        id: "eq6",
        name: "1:8 PLC Optical Splitter (Slot A)",
        type: "Splitter",
        serial: "SN-SPL-8821",
        status: "OPERATIONAL",
      },
      {
        id: "eq7",
        name: "1:8 PLC Optical Splitter (Slot B)",
        type: "Splitter",
        serial: "SN-SPL-8822",
        status: "OPERATIONAL",
      },
      {
        id: "eq8",
        name: "16-Port Terminal Block",
        type: "Terminal",
        serial: "SN-TB-1601",
        status: "OPERATIONAL",
      },
      {
        id: "eq9",
        name: "15A Din-Rail Breaker",
        type: "Breaker",
        serial: "SN-CB-15A",
        status: "OPERATIONAL",
      },
    ],
    clients: [
      {
        port: "Port 01",
        accountNumber: "ACC-IIT-001",
        name: "MSU-IIT Computer Center",
        plan: "1 Gbps Dedicated Link",
        status: "CONNECTED",
      },
      {
        port: "Port 02",
        accountNumber: "ACC-IIT-002",
        name: "College of Engineering & Tech",
        plan: "500 Mbps Academic Pro",
        status: "CONNECTED",
      },
      {
        port: "Port 03",
        accountNumber: "ACC-IIT-003",
        name: "Science & Math Complex",
        plan: "500 Mbps Academic Pro",
        status: "CONNECTED",
      },
      {
        port: "Port 04",
        accountNumber: "ACC-IIT-004",
        name: "University Administration Bldg",
        plan: "300 Mbps Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 05",
        accountNumber: "ACC-IIT-005",
        name: "Tibanga Student Dormitory Hub",
        plan: "200 Mbps Fiber",
        status: "CONNECTED",
      },
    ],
  },
  {
    id: "4",
    code: "DB-SB-03",
    category: "SUB_BOX",
    parentCode: "DB-MN-01",
    siteName: "Tubod Commercial Distribution Node",
    address: "Macapagal Highway, Tubod, Iligan City",
    latitude: 8.214,
    longitude: 124.236,
    status: "ACTIVE",
    totalPorts: 24,
    activePorts: 18,
    qrToken: "QRTECH-BOX-ILG-SB03-1204",
    lastScanned: "Sep 28, 2026 by R. Santos",
    notes: "South arterial node serving Tubod transport and commercial hub.",
    equipment: [
      {
        id: "eq10",
        name: "1:8 PLC Optical Splitter",
        type: "Splitter",
        serial: "SN-SPL-1102",
        status: "OPERATIONAL",
      },
      {
        id: "eq11",
        name: "16-Port Terminal Block",
        type: "Terminal",
        serial: "SN-TB-1602",
        status: "OPERATIONAL",
      },
      {
        id: "eq12",
        name: "15A Din-Rail Breaker",
        type: "Breaker",
        serial: "SN-CB-15B",
        status: "OPERATIONAL",
      },
    ],
    clients: [
      {
        port: "Port 01",
        accountNumber: "ACC-TBD-001",
        name: "Tubod South Terminal Admin",
        plan: "300 Mbps Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 02",
        accountNumber: "ACC-TBD-002",
        name: "Highway Petroleum Station",
        plan: "100 Mbps Business",
        status: "CONNECTED",
      },
      {
        port: "Port 03",
        accountNumber: "ACC-TBD-003",
        name: "Tubod Fresh Market Corp",
        plan: "100 Mbps Business",
        status: "CONNECTED",
      },
    ],
  },
  {
    id: "5",
    code: "DB-SB-04",
    category: "SUB_BOX",
    parentCode: "DB-MN-02",
    siteName: "Robinsons Place Iligan - Floor 2 Rack",
    address: "Macapagal Ave, Iligan City",
    latitude: 8.2205,
    longitude: 124.2385,
    status: "NEEDS_TAG",
    totalPorts: 32,
    activePorts: 12,
    qrToken: "QRTECH-BOX-ILG-SB04-7731",
    lastScanned: "Never (New Installation)",
    notes:
      "Newly mounted mall enclosure. Requires physical 50x50mm QR label affixing.",
    equipment: [
      {
        id: "eq13",
        name: "1:16 PLC Optical Splitter",
        type: "Splitter",
        serial: "SN-SPL-1601",
        status: "OPERATIONAL",
      },
      {
        id: "eq14",
        name: "2x 20A Circuit Breakers",
        type: "Breaker",
        serial: "SN-CB-20A-MALL",
        status: "OPERATIONAL",
      },
    ],
    clients: [
      {
        port: "Port 01",
        accountNumber: "ACC-ROB-001",
        name: "Robinsons Department Store",
        plan: "500 Mbps Enterprise",
        status: "CONNECTED",
      },
      {
        port: "Port 02",
        accountNumber: "ACC-ROB-002",
        name: "Robinsons Supermarket POS",
        plan: "300 Mbps Dedicated",
        status: "CONNECTED",
      },
      {
        port: "Port 03",
        accountNumber: "ACC-ROB-003",
        name: "Cinema Digital Feed",
        plan: "500 Mbps Dedicated",
        status: "CONNECTED",
      },
    ],
  },
  {
    id: "6",
    code: "DB-SB-05",
    category: "SUB_BOX",
    parentCode: "DB-MN-01",
    siteName: "Tambo Terminal Distribution Enclosure",
    address: "Hinaplanon-Tambo Highway, Iligan City",
    latitude: 8.249,
    longitude: 124.261,
    status: "NEEDS_TAG",
    totalPorts: 16,
    activePorts: 8,
    qrToken: "QRTECH-BOX-ILG-SB05-6612",
    lastScanned: "Never (New Expansion)",
    notes:
      "North highway feeder box installed last week. QR sticker pending dispatch.",
    equipment: [
      {
        id: "eq15",
        name: "1:8 PLC Optical Splitter",
        type: "Splitter",
        serial: "SN-SPL-8825",
        status: "OPERATIONAL",
      },
      {
        id: "eq16",
        name: "12-Port Terminal Block",
        type: "Terminal",
        serial: "SN-TB-1201",
        status: "OPERATIONAL",
      },
    ],
    clients: [
      {
        port: "Port 01",
        accountNumber: "ACC-TMB-001",
        name: "Tambo Logistics Hub",
        plan: "300 Mbps Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 02",
        accountNumber: "ACC-TMB-002",
        name: "Hinaplanon Fuel Depot",
        plan: "150 Mbps Business",
        status: "CONNECTED",
      },
    ],
  },
  {
    id: "7",
    code: "DB-SB-06",
    category: "SUB_BOX",
    parentCode: "DB-MN-02",
    siteName: "Del Carmen Secondary Sub-Box",
    address: "Del Carmen, Iligan City",
    latitude: 8.232,
    longitude: 124.259,
    status: "ISSUE",
    totalPorts: 24,
    activePorts: 16,
    qrToken: "QRTECH-BOX-ILG-SB06-3390",
    lastScanned: "Yesterday at 04:30 PM (Alarm Triggered)",
    notes:
      "ALARM: High temperature detected on breaker & optical attenuation on Port 3.",
    equipment: [
      {
        id: "eq17",
        name: "1:8 PLC Optical Splitter (Port 3 Degraded)",
        type: "Splitter",
        serial: "SN-SPL-8826",
        status: "FAULTY",
      },
      {
        id: "eq18",
        name: "20A Din-Rail Breaker (High Temp Alert)",
        type: "Breaker",
        serial: "SN-CB-20A-DEL",
        status: "FAULTY",
      },
    ],
    clients: [
      {
        port: "Port 01",
        accountNumber: "ACC-DLC-001",
        name: "Del Carmen Barangay Hall",
        plan: "200 Mbps Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 02",
        accountNumber: "ACC-DLC-002",
        name: "Del Carmen Health Center",
        plan: "100 Mbps Fiber",
        status: "CONNECTED",
      },
      {
        port: "Port 03",
        accountNumber: "ACC-DLC-003",
        name: "Commercial Plaza Hub (Degraded Signal)",
        plan: "200 Mbps Fiber",
        status: "CONNECTED",
      },
    ],
  },
];

type CategoryFilter =
  | "ALL"
  | "MAIN_BOX"
  | "SUB_BOX"
  | "ACTIVE"
  | "NEEDS_TAG"
  | "ISSUE";

export default function BoxManagementScreen() {
  const [boxes, setBoxes] = useState<DistributionBox[]>(INITIAL_BOXES);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("ALL");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals state
  const [selectedBoxForDetails, setSelectedBoxForDetails] =
    useState<DistributionBox | null>(null);
  const [selectedBoxForQR, setSelectedBoxForQR] =
    useState<DistributionBox | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<
    "CLIENTS" | "EQUIPMENT" | "SCAN_LOGS"
  >("CLIENTS");
  const [modalClientSearch, setModalClientSearch] = useState("");

  // Form State for Registering New Box
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState<"MAIN_BOX" | "SUB_BOX">(
    "SUB_BOX",
  );
  const [newParentCode, setNewParentCode] = useState("DB-MN-01");
  const [newSiteName, setNewSiteName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPorts, setNewPorts] = useState("24");
  const [newNotes, setNewNotes] = useState("");

  // Auto-generate next sequential Box Code (e.g. DB-MN-03 or DB-SB-07)
  const getNextBoxCode = (
    cat: "MAIN_BOX" | "SUB_BOX",
    currentBoxes: DistributionBox[] = boxes,
  ) => {
    const prefix = cat === "MAIN_BOX" ? "DB-MN-" : "DB-SB-";
    const numbers = currentBoxes
      .filter((b) => b.category === cat && b.code.startsWith(prefix))
      .map((b) => {
        const parsed = parseInt(b.code.replace(prefix, ""), 10);
        return isNaN(parsed) ? 0 : parsed;
      });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum < 10 ? "0" : ""}${nextNum}`;
  };

  const handleOpenRegisterModal = () => {
    const defaultCat: "MAIN_BOX" | "SUB_BOX" = "SUB_BOX";
    setNewCategory(defaultCat);
    setNewCode(getNextBoxCode(defaultCat, boxes));
    setNewParentCode("DB-MN-01");
    setIsRegisterModalOpen(true);
  };

  const isWeb = Platform.OS === "web";

  // Filter & Search Logic
  const filteredBoxes = boxes.filter((box) => {
    // Search query match
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      query === "" ||
      box.code.toLowerCase().includes(query) ||
      box.siteName.toLowerCase().includes(query) ||
      box.address.toLowerCase().includes(query) ||
      box.equipment.some((eq) => eq.name.toLowerCase().includes(query));

    if (!matchesQuery) return false;

    // Filter match
    if (activeFilter === "MAIN_BOX") return box.category === "MAIN_BOX";
    if (activeFilter === "SUB_BOX") return box.category === "SUB_BOX";
    if (activeFilter === "ACTIVE") return box.status === "ACTIVE";
    if (activeFilter === "NEEDS_TAG") return box.status === "NEEDS_TAG";
    if (activeFilter === "ISSUE") return box.status === "ISSUE";
    return true;
  });

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const totalPages = Math.max(1, Math.ceil(filteredBoxes.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredBoxes.length);
  const paginatedBoxes = filteredBoxes.slice(startIndex, endIndex);

  const getStatusBadge = (status: DistributionBox["status"]) => {
    switch (status) {
      case "ACTIVE":
        return {
          bg: "bg-emerald-50 border border-emerald-200",
          dot: "bg-emerald-500",
          text: "text-emerald-700",
          label: "Tagged & Active",
        };
      case "NEEDS_TAG":
        return {
          bg: "bg-amber-50 border border-amber-200",
          dot: "bg-amber-500",
          text: "text-amber-800",
          label: "Needs QR Tag",
        };
      case "ISSUE":
        return {
          bg: "bg-rose-50 border border-rose-200",
          dot: "bg-rose-500",
          text: "text-rose-700",
          label: "Hardware Alarm",
        };
    }
  };

  const handleRegisterBox = () => {
    if (!newCode.trim() || !newSiteName.trim() || !newAddress.trim()) {
      if (isWeb) {
        window.alert(
          "Please fill in Box Code, Site Name, and Physical Address.",
        );
      } else {
        Alert.alert(
          "Required Fields",
          "Please fill in Box Code, Site Name, and Physical Address.",
        );
      }
      return;
    }

    const newBox: DistributionBox = {
      id: `${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      category: newCategory,
      parentCode: newCategory === "SUB_BOX" ? newParentCode : undefined,
      siteName: newSiteName.trim(),
      address: newAddress.trim(),
      latitude: 8.23 + (Math.random() * 0.02 - 0.01),
      longitude: 124.245 + (Math.random() * 0.02 - 0.01),
      status: "NEEDS_TAG",
      totalPorts: parseInt(newPorts, 10) || 24,
      activePorts: 0,
      qrToken: `QRTECH-BOX-ILG-${newCode.trim().toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      lastScanned: "Never (New Registration)",
      notes:
        newNotes.trim() ||
        "Newly created box. QR tag pending physical dispatch.",
      equipment: [
        {
          id: `eq-${Date.now()}`,
          name:
            newCategory === "MAIN_BOX"
              ? "Main Feeder 24-Port"
              : "1:8 PLC Optical Splitter",
          type: newCategory === "MAIN_BOX" ? "Patch Panel" : "Splitter",
          serial: `SN-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
          status: "OPERATIONAL",
        },
        {
          id: `eq-${Date.now()}-2`,
          name: "15A Din-Rail Breaker",
          type: "Breaker",
          serial: `SN-CB-${Math.floor(100 + Math.random() * 900)}`,
          status: "OPERATIONAL",
        },
      ],
      clients: [],
    };

    setBoxes([newBox, ...boxes]);
    setIsRegisterModalOpen(false);

    // Reset Form
    setNewCode("");
    setNewSiteName("");
    setNewAddress("");
    setNewNotes("");

    // Open QR print preview for the newly added box immediately
    setSelectedBoxForQR(newBox);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />
      <View className="flex-1 flex-row h-full">
        {/* Responsive Collapsible Sidebar */}
        {isWeb && (
          <SidebarNavigation
            activeRoute="/admin/box-management"
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex"
          />
        )}

        {/* Main Box Management Canvas */}
        <View className="flex-1 flex-col h-full overflow-hidden">
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1 p-4 md:p-6"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Top Page Header */}
            <View className="flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200/80 gap-4 mb-5">
              <View>
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="server-network"
                      size={20}
                      color="#4d6029"
                    />
                  </View>
                  <Text className="text-2xl font-poppins-bold text-[#0f172a]">
                    Distribution Box Management
                  </Text>
                </View>
                <Text className="text-xs font-poppins text-[#64748b] mt-1 ml-12">
                  Configure hardware enclosures, track port capacities, and
                  generate 50x50mm QR code stickers.
                </Text>
              </View>

              {/* Top Action Buttons */}
              <View className="flex-row items-center space-x-2.5">
                <TouchableOpacity
                  onPress={() => router.push("/admin/dashboard")}
                  className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm mr-2"
                  activeOpacity={0.8}
                >
                  <Ionicons name="map-outline" size={16} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    View Map
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenRegisterModal}
                  className="bg-[#4d6029] px-5 py-2.5 rounded-2xl flex-row items-center shadow-md shadow-[#4d6029]/25"
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={18} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    + Register New Box
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 1. TOP ROW OF 4 SUMMARY METRIC CARDS */}
            <View className="flex-row flex-wrap -mx-2 mb-5">
              {/* Card 1: Total Enclosures */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Total Distribution Boxes
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center border border-slate-200/60">
                      <MaterialCommunityIcons
                        name="server"
                        size={16}
                        color="#475569"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      48
                    </Text>
                    <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-poppins-bold text-[#475569]">
                        6 Main · 42 Sub
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Across 7 Zones in Iligan City
                  </Text>
                </View>
              </View>

              {/* Card 2: Port Capacity Utilization */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Network Port Capacity
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
                      <MaterialCommunityIcons
                        name="lan-connect"
                        size={16}
                        color="#059669"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      384
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Text className="text-[10px] font-poppins-bold text-emerald-700">
                        84.8% Used
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    326 Active Subscriber Ports
                  </Text>
                </View>
              </View>

              {/* Card 3: Pending QR Tags */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border-2 border-amber-500/30 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Pending QR Stickers
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center border border-amber-200">
                      <MaterialCommunityIcons
                        name="qrcode-scan"
                        size={16}
                        color="#d97706"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      4
                    </Text>
                    <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Text className="text-[10px] font-poppins-bold text-amber-700">
                        Needs Dispatch
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Awaiting 50x50mm door label
                  </Text>
                </View>
              </View>

              {/* Card 4: Hardware Alarms */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border-2 border-rose-500/30 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Alarms & Faults
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center border border-rose-200">
                      <Ionicons name="alert" size={16} color="#dc2626" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      1
                    </Text>
                    <View className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <Text className="text-[10px] font-poppins-bold text-rose-700">
                        High Temp Alert
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    DB-SB-06 (Del Carmen)
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
                  placeholder="Search by code (e.g. DB-MN-01), site name, or equipment..."
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
                  { id: "ALL", label: `All (${boxes.length})` },
                  { id: "MAIN_BOX", label: "Main Hubs" },
                  { id: "SUB_BOX", label: "Sub-Boxes" },
                  { id: "ACTIVE", label: "Active" },
                  { id: "NEEDS_TAG", label: "Needs Tag" },
                  { id: "ISSUE", label: "Issues (1)" },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => {
                      setActiveFilter(filter.id as CategoryFilter);
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

            {/* 3. DISTRIBUTION BOXES INVENTORY DATA TABLE */}
            <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
              {/* Table Header Summary Strip */}
              <View className="px-6 py-4 border-b border-slate-100 flex-row items-center justify-between bg-white">
                <View className="flex-row items-center">
                  <Text className="text-sm font-poppins-bold text-[#0f172a]">
                    Distribution Enclosure Inventory
                  </Text>
                  <View className="bg-slate-100 px-2.5 py-0.5 rounded-full ml-2.5">
                    <Text className="text-[11px] font-poppins-bold text-[#475569]">
                      {filteredBoxes.length} Records
                    </Text>
                  </View>
                </View>
                <Text className="text-xs font-poppins text-[#94a3b8]">
                  Showing all monitored wall & pole enclosures in Iligan City
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
                    <View className="flex-[1.4] min-w-[150px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Box Code & Tier
                      </Text>
                    </View>
                    <View className="flex-[2.2] min-w-[220px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Site Location & Address
                      </Text>
                    </View>
                    <View className="flex-[1.2] min-w-[130px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Status
                      </Text>
                    </View>
                    <View className="flex-[2] min-w-[190px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Hardware Equipment
                      </Text>
                    </View>
                    <View className="flex-[1.3] min-w-[130px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Port Usage
                      </Text>
                    </View>
                    <View className="flex-[1.6] min-w-[160px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Last Technician Scan
                      </Text>
                    </View>
                    <View className="w-[110px] min-w-[110px] text-right">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider text-right">
                        Actions
                      </Text>
                    </View>
                  </View>

                  {/* Table Body Rows (Paginated) */}
                  {paginatedBoxes.map((box, index) => {
                    const statusMeta = getStatusBadge(box.status);
                    const capacityPercent = Math.round(
                      (box.activePorts / box.totalPorts) * 100,
                    );

                    return (
                      <View
                        key={box.id}
                        className={`flex-row items-center px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors w-full ${
                          index % 2 === 1 ? "bg-[#fafbfc]" : "bg-white"
                        }`}
                      >
                        {/* 1. Box Code & Tier */}
                        <View className="flex-[1.4] min-w-[150px] pr-2">
                          <View className="flex-row items-center">
                            <View className="bg-[#0f172a] px-2.5 py-1 rounded-lg flex-row items-center">
                              <MaterialCommunityIcons
                                name={
                                  box.category === "MAIN_BOX"
                                    ? "server"
                                    : "router-network"
                                }
                                size={12}
                                color="#ffffff"
                              />
                              <Text className="text-xs font-poppins-bold text-white ml-1.5">
                                {box.code}
                              </Text>
                            </View>
                          </View>
                          <View className="mt-1 flex-row items-center">
                            <Text
                              className={`text-[10px] font-poppins-bold uppercase ${
                                box.category === "MAIN_BOX"
                                  ? "text-[#4d6029]"
                                  : "text-sky-700"
                              }`}
                            >
                              {box.category === "MAIN_BOX"
                                ? "Main Feeder"
                                : "Sub-Box"}
                            </Text>
                            {box.parentCode && (
                              <Text className="text-[10px] font-poppins text-[#64748b] ml-1">
                                ↳ {box.parentCode}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* 2. Site Location & Address */}
                        <View className="flex-[2.2] min-w-[220px] pr-3">
                          <Text
                            className="text-xs font-poppins-bold text-[#0f172a]"
                            numberOfLines={1}
                          >
                            {box.siteName}
                          </Text>
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons
                              name="location-outline"
                              size={11}
                              color="#64748b"
                            />
                            <Text
                              className="text-[11px] font-poppins text-[#64748b] ml-1 flex-1"
                              numberOfLines={1}
                            >
                              {box.address}
                            </Text>
                          </View>
                        </View>

                        {/* 3. Status Badge */}
                        <View className="flex-[1.2] min-w-[130px] pr-2">
                          <View
                            className={`inline-flex self-start px-2.5 py-1 rounded-lg flex-row items-center ${statusMeta.bg}`}
                          >
                            <View
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusMeta.dot}`}
                            />
                            <Text
                              className={`text-[10px] font-poppins-bold ${statusMeta.text}`}
                            >
                              {statusMeta.label}
                            </Text>
                          </View>
                        </View>

                        {/* 4. Hardware Equipment */}
                        <View className="flex-[2] min-w-[190px] pr-3">
                          <View className="flex-row flex-wrap gap-1">
                            {box.equipment.slice(0, 2).map((eq) => (
                              <View
                                key={eq.id}
                                className={`px-2 py-0.5 rounded-md border flex-row items-center ${
                                  eq.status === "FAULTY"
                                    ? "bg-rose-50 border-rose-200"
                                    : "bg-slate-100/70 border-slate-200/60"
                                }`}
                              >
                                <View
                                  className={`w-1 h-1 rounded-full mr-1 ${
                                    eq.status === "FAULTY"
                                      ? "bg-rose-500"
                                      : "bg-emerald-500"
                                  }`}
                                />
                                <Text
                                  className={`text-[9.5px] font-poppins-medium ${
                                    eq.status === "FAULTY"
                                      ? "text-rose-700 font-bold"
                                      : "text-[#334155]"
                                  }`}
                                  numberOfLines={1}
                                >
                                  {eq.name.split("(")[0].trim()}
                                </Text>
                              </View>
                            ))}
                            {box.equipment.length > 2 && (
                              <View className="bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60">
                                <Text className="text-[9.5px] font-poppins-bold text-[#64748b]">
                                  +{box.equipment.length - 2}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* 5. Port Usage */}
                        <View className="flex-[1.3] min-w-[130px] pr-3">
                          <View className="flex-row items-baseline justify-between mb-1">
                            <Text className="text-xs font-poppins-bold text-[#0f172a]">
                              {box.activePorts}/{box.totalPorts}
                            </Text>
                            <Text className="text-[10px] font-poppins-bold text-[#64748b]">
                              {capacityPercent}%
                            </Text>
                          </View>
                          <View className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <View
                              className={`h-full rounded-full ${
                                capacityPercent > 85
                                  ? "bg-amber-500"
                                  : "bg-[#4d6029]"
                              }`}
                              style={{ width: `${capacityPercent}%` }}
                            />
                          </View>
                        </View>

                        {/* 6. Last Technician Scan */}
                        <View className="flex-[1.6] min-w-[160px] pr-3">
                          <View className="flex-row items-center">
                            <Ionicons
                              name="time-outline"
                              size={11}
                              color="#64748b"
                            />
                            <Text
                              className="text-xs font-poppins-bold text-[#0f172a] ml-1"
                              numberOfLines={1}
                            >
                              {box.lastScanned
                                ? box.lastScanned.split("by")[0].trim()
                                : "Never"}
                            </Text>
                          </View>
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons
                              name="person-circle-outline"
                              size={11}
                              color="#4d6029"
                            />
                            <Text
                              className="text-[10px] font-poppins-medium text-[#475569] ml-1"
                              numberOfLines={1}
                            >
                              {box.lastScanned?.includes("by")
                                ? box.lastScanned.split("by")[1].trim()
                                : box.status === "NEEDS_TAG"
                                  ? "Pending Initial Tag"
                                  : "System Created"}
                            </Text>
                          </View>
                        </View>

                        {/* 7. Actions */}
                        <View className="w-[110px] min-w-[110px] flex-row items-center justify-end space-x-1.5">
                          <TouchableOpacity
                            onPress={() => setSelectedBoxForQR(box)}
                            className="w-7 h-7 rounded-lg bg-[#4d6029]/10 hover:bg-[#4d6029]/20 border border-[#4d6029]/30 items-center justify-center mr-1"
                            accessibilityLabel="Print QR"
                          >
                            <MaterialCommunityIcons
                              name="qrcode-scan"
                              size={13}
                              color="#4d6029"
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setSelectedBoxForDetails(box);
                              setActiveDetailsTab("CLIENTS");
                            }}
                            className="bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg flex-row items-center shadow-xs"
                          >
                            <Ionicons
                              name="folder-open-outline"
                              size={11}
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
                      {filteredBoxes.length === 0 ? 0 : startIndex + 1} -{" "}
                      {endIndex}
                    </Text>{" "}
                    of{" "}
                    <Text className="font-poppins-bold text-[#0f172a]">
                      {filteredBoxes.length}
                    </Text>{" "}
                    boxes
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

      {/* MODAL 1: DETAILED BOX INSPECTOR & PORT DIRECTORY */}
      {selectedBoxForDetails && (
        <Modal
          visible={!!selectedBoxForDetails}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setSelectedBoxForDetails(null);
            setModalClientSearch("");
          }}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden flex-col">
              {/* 1. Inspector Header Overview (Classification, Status, Location, Topology) */}
              <View className="px-6 py-5 border-b border-slate-100 bg-slate-50/90">
                {/* Top Row: Badges & Close Button */}
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="flex-row items-center flex-wrap gap-2">
                    {/* Box Code */}
                    <View className="bg-[#0f172a] px-3 py-1 rounded-xl flex-row items-center">
                      <MaterialCommunityIcons
                        name={
                          selectedBoxForDetails.category === "MAIN_BOX"
                            ? "server"
                            : "router-network"
                        }
                        size={13}
                        color="#ffffff"
                      />
                      <Text className="text-xs font-poppins-bold text-white ml-1.5">
                        {selectedBoxForDetails.code}
                      </Text>
                    </View>

                    {/* Tier Classification Badge */}
                    <View
                      className={`px-2.5 py-1 rounded-xl flex-row items-center border ${
                        selectedBoxForDetails.category === "MAIN_BOX"
                          ? "bg-[#4d6029]/10 border-[#4d6029]/30"
                          : "bg-sky-50 border-sky-200"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-poppins-bold uppercase ${
                          selectedBoxForDetails.category === "MAIN_BOX"
                            ? "text-[#4d6029]"
                            : "text-sky-700"
                        }`}
                      >
                        {selectedBoxForDetails.category === "MAIN_BOX"
                          ? "🏢 Main Distribution Hub"
                          : "🔀 Branch Sub-Box"}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      className={`px-2.5 py-1 rounded-xl flex-row items-center ${
                        getStatusBadge(selectedBoxForDetails.status).bg
                      }`}
                    >
                      <View
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          getStatusBadge(selectedBoxForDetails.status).dot
                        }`}
                      />
                      <Text
                        className={`text-[10px] font-poppins-bold ${
                          getStatusBadge(selectedBoxForDetails.status).text
                        }`}
                      >
                        {getStatusBadge(selectedBoxForDetails.status).label}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedBoxForDetails(null);
                      setModalClientSearch("");
                    }}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs"
                  >
                    <Ionicons name="close" size={18} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Site Name */}
                <Text className="text-base sm:text-lg font-poppins-bold text-[#0f172a]">
                  {selectedBoxForDetails.siteName}
                </Text>

                {/* Location & GPS Info Bar */}
                <View className="flex-row flex-wrap items-center gap-y-1 gap-x-3 mt-1.5">
                  <View className="flex-row items-center flex-1 min-w-[200px]">
                    <Ionicons name="location" size={13} color="#4d6029" />
                    <Text
                      className="text-xs font-poppins-medium text-[#475569] ml-1"
                      numberOfLines={1}
                    >
                      {selectedBoxForDetails.address}
                    </Text>
                  </View>

                  <View className="flex-row items-center bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
                    <Ionicons
                      name="navigate-outline"
                      size={11}
                      color="#64748b"
                    />
                    <Text className="text-[10px] font-mono text-[#475569] ml-1">
                      {selectedBoxForDetails.latitude.toFixed(4)}°N,{" "}
                      {selectedBoxForDetails.longitude.toFixed(4)}°E
                    </Text>
                  </View>
                </View>

                {/* Hierarchy Topology Info */}
                <View className="mt-2.5 pt-2 border-t border-slate-200/60 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <MaterialCommunityIcons
                      name="source-branch"
                      size={13}
                      color="#64748b"
                    />
                    {selectedBoxForDetails.category === "SUB_BOX" ? (
                      <Text className="text-[11px] font-poppins text-[#64748b] ml-1">
                        Upstream Feeder:{" "}
                        <Text className="font-poppins-bold text-[#0f172a]">
                          {selectedBoxForDetails.parentCode || "DB-MN-01"}
                        </Text>
                      </Text>
                    ) : (
                      <Text className="text-[11px] font-poppins text-[#64748b] ml-1">
                        Network Role:{" "}
                        <Text className="font-poppins-bold text-[#4d6029]">
                          Primary Backbone Hub
                        </Text>
                      </Text>
                    )}
                  </View>

                  <Text className="text-[11px] font-poppins text-[#64748b]">
                    Port Capacity:{" "}
                    <Text className="font-poppins-bold text-[#0f172a]">
                      {selectedBoxForDetails.activePorts}/
                      {selectedBoxForDetails.totalPorts}
                    </Text>{" "}
                    (
                    {Math.round(
                      (selectedBoxForDetails.activePorts /
                        selectedBoxForDetails.totalPorts) *
                        100,
                    )}
                    %)
                  </Text>
                </View>
              </View>

              {/* 2. Tab Switcher */}
              <View className="flex-row border-b border-slate-100 px-6 pt-3 bg-white">
                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("CLIENTS")}
                  className={`pb-3 mr-6 flex-row items-center border-b-2 ${
                    activeDetailsTab === "CLIENTS"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <Ionicons
                    name="people"
                    size={16}
                    color={
                      activeDetailsTab === "CLIENTS" ? "#4d6029" : "#94a3b8"
                    }
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "CLIENTS"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Connected Clients ({selectedBoxForDetails.clients.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("EQUIPMENT")}
                  className={`pb-3 mr-6 flex-row items-center border-b-2 ${
                    activeDetailsTab === "EQUIPMENT"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="tools"
                    size={16}
                    color={
                      activeDetailsTab === "EQUIPMENT" ? "#4d6029" : "#94a3b8"
                    }
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "EQUIPMENT"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Hardware & Equipment (
                    {selectedBoxForDetails.equipment.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("SCAN_LOGS")}
                  className={`pb-3 flex-row items-center border-b-2 ${
                    activeDetailsTab === "SCAN_LOGS"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <Ionicons
                    name="time"
                    size={16}
                    color={
                      activeDetailsTab === "SCAN_LOGS" ? "#4d6029" : "#94a3b8"
                    }
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "SCAN_LOGS"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Scan Telemetry
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 3. Tab Content Body */}
              <ScrollView className="p-6 flex-1 max-h-[50vh]">
                {activeDetailsTab === "CLIENTS" && (
                  <View>
                    {/* Capacity Summary & In-Modal Client Search Bar */}
                    <View className="mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-poppins-bold text-[#0f172a]">
                          Port Allocation: {selectedBoxForDetails.activePorts}{" "}
                          of {selectedBoxForDetails.totalPorts} Ports Active
                        </Text>
                        <Text className="text-xs font-poppins-semibold text-[#4d6029]">
                          {selectedBoxForDetails.totalPorts -
                            selectedBoxForDetails.activePorts}{" "}
                          Available
                        </Text>
                      </View>
                      <View className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-3">
                        <View
                          className="h-full rounded-full bg-[#4d6029]"
                          style={{
                            width: `${Math.round(
                              (selectedBoxForDetails.activePorts /
                                selectedBoxForDetails.totalPorts) *
                                100,
                            )}%`,
                          }}
                        />
                      </View>

                      {/* In-Modal Search Input */}
                      <View className="flex-row items-center bg-white border border-slate-200/80 rounded-xl px-3 py-1.5">
                        <Ionicons name="search" size={14} color="#64748b" />
                        <TextInput
                          placeholder="Search connected subscriber, account #, or port..."
                          placeholderTextColor="#94a3b8"
                          value={modalClientSearch}
                          onChangeText={setModalClientSearch}
                          className="flex-1 ml-2 text-xs font-poppins text-[#0f172a]"
                        />
                        {modalClientSearch.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setModalClientSearch("")}
                          >
                            <Ionicons
                              name="close-circle"
                              size={14}
                              color="#94a3b8"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Filtered Clients List */}
                    {(() => {
                      const query = modalClientSearch.toLowerCase().trim();
                      const filteredClients =
                        selectedBoxForDetails.clients.filter(
                          (c) =>
                            query === "" ||
                            c.name.toLowerCase().includes(query) ||
                            c.accountNumber.toLowerCase().includes(query) ||
                            c.port.toLowerCase().includes(query) ||
                            c.plan.toLowerCase().includes(query),
                        );

                      if (selectedBoxForDetails.clients.length === 0) {
                        return (
                          <View className="py-10 items-center justify-center">
                            <Ionicons
                              name="people-outline"
                              size={36}
                              color="#cbd5e1"
                            />
                            <Text className="text-xs font-poppins-medium text-[#94a3b8] mt-2">
                              No subscribers connected to this box yet.
                            </Text>
                          </View>
                        );
                      }

                      if (filteredClients.length === 0) {
                        return (
                          <View className="py-8 items-center justify-center">
                            <Ionicons
                              name="search-outline"
                              size={28}
                              color="#cbd5e1"
                            />
                            <Text className="text-xs font-poppins-medium text-[#94a3b8] mt-1.5">
                              {`No matching clients found for "${modalClientSearch}".`}
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <View className="space-y-2">
                          {filteredClients.map((client) => (
                            <View
                              key={client.port}
                              className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex-row items-center justify-between mb-2"
                            >
                              <View className="flex-row items-center flex-1 mr-2">
                                <View className="w-16 bg-white border border-slate-200 py-1.5 rounded-xl items-center justify-center mr-3 shadow-xs">
                                  <Text className="text-xs font-poppins-bold text-[#0f172a]">
                                    {client.port}
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text
                                    className="text-xs font-poppins-bold text-[#0f172a]"
                                    numberOfLines={1}
                                  >
                                    {client.name}
                                  </Text>
                                  <Text
                                    className="text-[11px] font-poppins text-[#64748b]"
                                    numberOfLines={1}
                                  >
                                    {client.accountNumber} · {client.plan}
                                  </Text>
                                </View>
                              </View>

                              <View className="bg-emerald-100 px-2.5 py-1 rounded-lg">
                                <Text className="text-[10px] font-poppins-bold text-emerald-800">
                                  🟢 Active
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                    })()}
                  </View>
                )}

                {activeDetailsTab === "EQUIPMENT" && (
                  <View className="space-y-2.5">
                    {selectedBoxForDetails.equipment.map((eq) => (
                      <View
                        key={eq.id}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex-row items-center justify-between mb-2"
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <View
                            className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                              eq.status === "FAULTY"
                                ? "bg-rose-100"
                                : "bg-emerald-100"
                            }`}
                          >
                            <MaterialCommunityIcons
                              name="cpu-64-bit"
                              size={18}
                              color={
                                eq.status === "FAULTY" ? "#dc2626" : "#059669"
                              }
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs font-poppins-bold text-[#0f172a]">
                              {eq.name}
                            </Text>
                            <Text className="text-[11px] font-poppins text-[#64748b]">
                              Type: {eq.type} · Serial: {eq.serial}
                            </Text>
                          </View>
                        </View>

                        <View
                          className={`px-2.5 py-1 rounded-lg ${
                            eq.status === "FAULTY"
                              ? "bg-rose-100"
                              : "bg-emerald-100"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-poppins-bold ${
                              eq.status === "FAULTY"
                                ? "text-rose-800"
                                : "text-emerald-800"
                            }`}
                          >
                            {eq.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {activeDetailsTab === "SCAN_LOGS" && (
                  <View className="space-y-3">
                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                      <Text className="text-xs font-poppins-bold text-[#0f172a] mb-1">
                        Physical Token & QR Identifier:
                      </Text>
                      <Text className="text-xs font-mono text-[#4d6029] bg-white p-2.5 rounded-xl border border-slate-200 select-all">
                        {selectedBoxForDetails.qrToken}
                      </Text>
                      <View className="mt-3 pt-3 border-t border-slate-200/70">
                        <Text className="text-xs font-poppins-bold text-[#0f172a] mb-0.5">
                          Last Technician Scan:
                        </Text>
                        <Text className="text-xs font-poppins text-[#475569]">
                          {selectedBoxForDetails.lastScanned ||
                            "No scan recorded yet"}
                        </Text>
                      </View>
                      <Text className="text-[11px] font-poppins text-[#64748b] mt-2">
                        {selectedBoxForDetails.notes}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* 4. Inspector Footer Actions */}
              <View className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBoxForDetails(null);
                    router.push("/admin/dashboard");
                  }}
                  className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl flex-row items-center shadow-xs"
                >
                  <Ionicons name="map-outline" size={14} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    View on Map
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={() => {
                      const box = selectedBoxForDetails;
                      setSelectedBoxForDetails(null);
                      setModalClientSearch("");
                      setSelectedBoxForQR(box);
                    }}
                    className="bg-[#4d6029] px-4 py-2.5 rounded-xl flex-row items-center mr-2 shadow-sm"
                  >
                    <MaterialCommunityIcons
                      name="qrcode-scan"
                      size={15}
                      color="#ffffff"
                    />
                    <Text className="text-xs font-poppins-bold text-white ml-1.5">
                      Print 50x50mm Sticker
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedBoxForDetails(null);
                      setModalClientSearch("");
                    }}
                    className="px-4 py-2.5 bg-slate-200 rounded-xl"
                  >
                    <Text className="text-xs font-poppins-bold text-[#475569]">
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: REGISTER NEW DISTRIBUTION BOX */}
      {isRegisterModalOpen && (
        <Modal
          visible={isRegisterModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsRegisterModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6">
              <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                    <Ionicons name="add-circle" size={18} color="#4d6029" />
                  </View>
                  <Text className="text-base font-poppins-bold text-[#0f172a]">
                    Register New Distribution Box
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsRegisterModalOpen(false)}
                  className="p-1 rounded-full bg-slate-100"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Form Body */}
              <ScrollView className="max-h-[60vh] space-y-3.5 pr-1">
                {/* Category Picker */}
                <View>
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                    Box Classification & Tier:
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        setNewCategory("MAIN_BOX");
                        setNewCode(getNextBoxCode("MAIN_BOX", boxes));
                      }}
                      className={`flex-1 py-2.5 rounded-xl border items-center ${
                        newCategory === "MAIN_BOX"
                          ? "bg-[#4d6029] border-[#4d6029]"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-poppins-bold ${
                          newCategory === "MAIN_BOX"
                            ? "text-white"
                            : "text-[#475569]"
                        }`}
                      >
                        Main Distribution Hub
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setNewCategory("SUB_BOX");
                        setNewCode(getNextBoxCode("SUB_BOX", boxes));
                      }}
                      className={`flex-1 py-2.5 rounded-xl border items-center ${
                        newCategory === "SUB_BOX"
                          ? "bg-[#4d6029] border-[#4d6029]"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-poppins-bold ${
                          newCategory === "SUB_BOX"
                            ? "text-white"
                            : "text-[#475569]"
                        }`}
                      >
                        Branch Sub-Box
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Box Code & Parent Feeder */}
                <View className="flex-row gap-2.5">
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-semibold text-[#475569] mb-1 mt-3">
                      Box Code:
                    </Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <TextInput
                        placeholder="e.g. DB-SB-07"
                        placeholderTextColor="#94a3b8"
                        value={newCode}
                        onChangeText={setNewCode}
                        className="flex-1 text-xs font-poppins-bold text-[#0f172a]"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setNewCode(getNextBoxCode(newCategory, boxes))
                        }
                        className="p-1 rounded-md bg-white border border-slate-200 ml-1.5"
                        accessibilityLabel="Regenerate Code"
                      >
                        <Ionicons name="refresh" size={13} color="#4d6029" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {newCategory === "SUB_BOX" && (
                    <View className="flex-1">
                      <Text className="text-xs font-poppins-semibold text-[#475569] mb-1 mt-3">
                        Feeder Parent:
                      </Text>
                      <TextInput
                        placeholder="e.g. DB-MN-01"
                        placeholderTextColor="#94a3b8"
                        value={newParentCode}
                        onChangeText={setNewParentCode}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-poppins-medium text-[#0f172a]"
                      />
                    </View>
                  )}
                </View>

                {/* Site Name */}
                <View>
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1 mt-3">
                    Site / Facility Name:
                  </Text>
                  <TextInput
                    placeholder="e.g. Suarez Terminal Secondary Node"
                    placeholderTextColor="#94a3b8"
                    value={newSiteName}
                    onChangeText={setNewSiteName}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-poppins-medium text-[#0f172a]"
                  />
                </View>

                {/* Address */}
                <View>
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1 mt-3">
                    Physical Street Address:
                  </Text>
                  <TextInput
                    placeholder="e.g. National Highway, Suarez, Iligan City"
                    placeholderTextColor="#94a3b8"
                    value={newAddress}
                    onChangeText={setNewAddress}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-poppins-medium text-[#0f172a]"
                  />
                </View>

                {/* Port Capacity & Notes */}
                <View className="flex-row gap-2.5">
                  <View className="w-1/3">
                    <Text className="text-xs font-poppins-semibold text-[#475569] mb-1 mt-3">
                      Total Ports:
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="24"
                      placeholderTextColor="#94a3b8"
                      value={newPorts}
                      onChangeText={setNewPorts}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-poppins-medium text-[#0f172a]"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-poppins-semibold text-[#475569] mb-1 mt-3">
                      Notes / Hardware Specs:
                    </Text>
                    <TextInput
                      placeholder="e.g. Wall mount with 1:8 PLC splitter"
                      placeholderTextColor="#94a3b8"
                      value={newNotes}
                      onChangeText={setNewNotes}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-poppins-medium text-[#0f172a]"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Form Action Buttons */}
              <View className="flex-row space-x-2 pt-4 border-t border-slate-100 mt-4">
                <TouchableOpacity
                  onPress={handleRegisterBox}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row shadow-sm mr-2"
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                  <Text className="text-white text-xs font-poppins-bold ml-1.5">
                    Save Box & Generate QR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-[#475569] text-xs font-poppins-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 3: 50x50mm THERMAL QR STICKER PREVIEW */}
      {selectedBoxForQR && (
        <Modal
          visible={!!selectedBoxForQR}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBoxForQR(null)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <Text className="text-base font-poppins-bold text-[#0f172a]">
                  Thermal QR Sticker Label
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedBoxForQR(null)}
                  className="p-1.5 rounded-full bg-slate-100"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Printable Sticker Preview Card (50x50mm Format) */}
              <View className="bg-white p-5 rounded-2xl border-2 border-dashed border-slate-300 items-center mb-5">
                <View className="flex-row items-center mb-2">
                  <View className="w-5 h-5 rounded bg-[#4d6029] items-center justify-center mr-1.5">
                    <MaterialCommunityIcons
                      name="qrcode-scan"
                      size={12}
                      color="#ffffff"
                    />
                  </View>
                  <Text className="text-[11px] font-poppins-bold text-[#0f172a] uppercase tracking-wider">
                    MULTIFACTORS · ILIGAN
                  </Text>
                </View>

                {/* QR Code Graphic with High Error Correction Pattern */}
                <View className="w-36 h-36 bg-[#f8fafc] border border-slate-200 rounded-2xl items-center justify-center p-2 mb-3 shadow-inner">
                  <MaterialCommunityIcons
                    name="qrcode"
                    size={110}
                    color="#0f172a"
                  />
                </View>

                <Text className="text-lg font-poppins-bold text-[#0f172a]">
                  {selectedBoxForQR.code}
                </Text>
                <Text className="text-xs font-poppins-semibold text-[#4d6029]">
                  {selectedBoxForQR.category === "MAIN_BOX"
                    ? "MAIN DISTRIBUTION HUB"
                    : "BRANCH SUB-BOX"}
                </Text>
                <Text className="text-[11px] font-poppins text-[#64748b] text-center mt-1">
                  {selectedBoxForQR.siteName}
                </Text>
                <Text className="text-[9px] font-mono text-[#94a3b8] mt-1.5">
                  {selectedBoxForQR.qrToken}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  onPress={() => {
                    if (isWeb) {
                      window.alert(
                        `Printing 50x50mm QR thermal label for ${selectedBoxForQR.code}`,
                      );
                    } else {
                      Alert.alert(
                        "Print Thermal Label",
                        `Sending 50x50mm label for ${selectedBoxForQR.code} to thermal printer.`,
                      );
                    }
                    setSelectedBoxForQR(null);
                  }}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row shadow-sm mr-2"
                  activeOpacity={0.85}
                >
                  <Ionicons name="print-outline" size={18} color="#ffffff" />
                  <Text className="text-white text-xs font-poppins-bold ml-1.5">
                    Print 50x50mm
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedBoxForQR(null)}
                  className="px-4 py-3 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-[#475569] text-xs font-poppins-bold">
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
