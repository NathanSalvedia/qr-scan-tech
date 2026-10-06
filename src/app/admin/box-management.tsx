import { SidebarNavigation } from "@/components/sidebar-navigation";
import {
  STANDARD_HARDWARE_CATALOG,
  STATIC_SUBSCRIBERS_DIRECTORY,
  SubscriberDirectoryRecord,
} from "@/constants/distribution-boxes";
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
  plan?: string;
  status: "CONNECTED" | "DISCONNECTED";
}

export interface DistributionBox {
  id: string;
  code: string;
  category: "MAIN_BOX" | "SUB_BOX";
  parentCode?: string;
  siteName: string;
  address: string;
  mountingType?: "Utility Pole" | "Wall Mount" | "Cabinet";
  poleNumber?: string;
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

export const SERVICE_PLANS = [
  "100 Mbps Fiber Starter",
  "200 Mbps Fiber Pro",
  "300 Mbps Business Fiber",
  "500 Mbps Dedicated Fiber",
  "1 Gbps Enterprise Link",
];

const INITIAL_BOXES: DistributionBox[] = [
  {
    id: "1",
    code: "DB-MN-01",
    category: "MAIN_BOX",
    siteName: "Iligan City Hall / Aguinaldo Central Hub",
    address: "Aguinaldo St, Poblacion, Iligan City",
    mountingType: "Utility Pole",
    poleNumber: "Pole #ILG-PL-01",
    latitude: 8.2285,
    longitude: 124.2415,
    status: "ACTIVE",
    totalPorts: 48,
    activePorts: 42,
    qrToken: "QRTECH-BOX-MN01-8891",
    lastScanned: "Today at 09:15 AM by Alex Davies",
    notes: "Primary optical distribution box feeding 4 downstream sub-boxes.",
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
    mountingType: "Utility Pole",
    poleNumber: "Pole #ILG-PL-09",
    latitude: 8.2238,
    longitude: 124.2458,
    status: "ACTIVE",
    totalPorts: 32,
    activePorts: 28,
    qrToken: "QRTECH-BOX-MN02-4412",
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
        name: "Maria Clara Santos",
        plan: "200 Mbps Fiber Pro",
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
    mountingType: "Utility Pole",
    poleNumber: "Pole #ILG-TB-14",
    latitude: 8.2415,
    longitude: 124.244,
    status: "ACTIVE",
    totalPorts: 32,
    activePorts: 24,
    qrToken: "QRTECH-BOX-SB02-9901",
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
    mountingType: "Utility Pole",
    poleNumber: "Pole #ILG-TBD-42",
    latitude: 8.214,
    longitude: 124.236,
    status: "ACTIVE",
    totalPorts: 24,
    activePorts: 18,
    qrToken: "QRTECH-BOX-SB03-1204",
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
    mountingType: "Wall Mount",
    poleNumber: "Rack #F2-R03 (Mall 2F)",
    latitude: 8.2205,
    longitude: 124.2385,
    status: "NEEDS_TAG",
    totalPorts: 32,
    activePorts: 12,
    qrToken: "QRTECH-BOX-SB04-7731",
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
    mountingType: "Utility Pole",
    poleNumber: "Pole #ILG-TMB-88",
    latitude: 8.249,
    longitude: 124.261,
    status: "NEEDS_TAG",
    totalPorts: 16,
    activePorts: 8,
    qrToken: "QRTECH-BOX-SB05-6612",
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
    mountingType: "Utility Pole",
    poleNumber: "Pole #ILG-DLC-21",
    latitude: 8.232,
    longitude: 124.259,
    status: "ISSUE",
    totalPorts: 24,
    activePorts: 16,
    qrToken: "QRTECH-BOX-SB06-3390",
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
  const [newMountingType, setNewMountingType] = useState<
    "Utility Pole" | "Wall Mount" | "Cabinet"
  >("Utility Pole");
  const [newPoleNumber, setNewPoleNumber] = useState("");
  const [newPorts, setNewPorts] = useState("24");
  const [isPortsDropdownOpen, setIsPortsDropdownOpen] = useState(false);
  const [newSelectedEquipment, setNewSelectedEquipment] = useState<string[]>([
    "PLC Optical Splitter",
    "Fiber Optic Adapters / Couplers",
    "Splice Tray",
    "IP65/IP66 Weatherproof Enclosure",
  ]);
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const [customEquipmentInput, setCustomEquipmentInput] = useState("");
  const [equipmentCatalogFilter, setEquipmentCatalogFilter] =
    useState<string>("ALL");

  // Connect New Client Modal State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientPort, setNewClientPort] = useState("");
  const [newClientAccount, setNewClientAccount] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [isClientPortDropdownOpen, setIsClientPortDropdownOpen] =
    useState(false);
  const [matchedSubscriber, setMatchedSubscriber] =
    useState<SubscriberDirectoryRecord | null>(null);
  const [isSubscriberDirectoryOpen, setIsSubscriberDirectoryOpen] =
    useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState("");

  const getAvailablePorts = (box: DistributionBox | null) => {
    if (!box) return [];
    const occupied = new Set(box.clients.map((c) => c.port));
    const available: string[] = [];
    for (let i = 1; i <= box.totalPorts; i++) {
      const portLabel = `Port ${i < 10 ? "0" + i : i}`;
      if (!occupied.has(portLabel)) {
        available.push(portLabel);
      }
    }
    return available;
  };

  const generateSequentialAccount = (box: DistributionBox | null) => {
    if (!box) return "ACC-ILG-001";
    const zonePrefix =
      box.code.includes("MN01") || box.code.includes("MN-01")
        ? "ILG"
        : box.code.includes("SB03") || box.code.includes("SB-03")
          ? "TBD"
          : box.code.includes("SB02") || box.code.includes("SB-02")
            ? "IIT"
            : box.code.includes("SB05") || box.code.includes("SB-05")
              ? "TMB"
              : box.code.includes("SB06") || box.code.includes("SB-06")
                ? "DLC"
                : "ILG";
    const nextSeq = box.clients.length + 1;
    return `ACC-${zonePrefix}-${
      nextSeq < 10 ? "00" + nextSeq : nextSeq < 100 ? "0" + nextSeq : nextSeq
    }`;
  };

  const handleAccountChange = (acc: string) => {
    setNewClientAccount(acc);
    const trimmed = acc.trim().toUpperCase();
    if (!trimmed) {
      setMatchedSubscriber(null);
      return;
    }
    const matched = STATIC_SUBSCRIBERS_DIRECTORY.find(
      (s) => s.accountNumber.toUpperCase() === trimmed,
    );
    if (matched) {
      setNewClientName(matched.name);
      setMatchedSubscriber(matched);
    } else {
      setMatchedSubscriber(null);
    }
  };

  const handleSelectFromDirectory = (sub: SubscriberDirectoryRecord) => {
    setNewClientAccount(sub.accountNumber);
    setNewClientName(sub.name);
    setMatchedSubscriber(sub);
    setIsSubscriberDirectoryOpen(false);
  };

  const handleOpenAddClientModal = () => {
    if (!selectedBoxForDetails) return;
    const available = getAvailablePorts(selectedBoxForDetails);
    if (available.length === 0) {
      if (Platform.OS === "web") {
        window.alert(
          "Capacity Full: All ports on this distribution box are currently occupied.",
        );
      } else {
        Alert.alert(
          "Capacity Full",
          "All ports on this distribution box are currently occupied.",
        );
      }
      return;
    }
    const defaultPort = available[0];
    setNewClientPort(defaultPort);

    // Identify already assigned subscriber accounts across all boxes
    const assignedAccounts = new Set(
      boxes.flatMap((b) => b.clients.map((c) => c.accountNumber.toUpperCase())),
    );

    // Look for first pending/unassigned subscriber in directory matching the zone or overall
    const unassignedInDirectory = STATIC_SUBSCRIBERS_DIRECTORY.find(
      (s) =>
        s.status === "PENDING_PROVISIONING" &&
        !assignedAccounts.has(s.accountNumber.toUpperCase()),
    );

    if (unassignedInDirectory) {
      setNewClientAccount(unassignedInDirectory.accountNumber);
      setNewClientName(unassignedInDirectory.name);
      setMatchedSubscriber(unassignedInDirectory);
    } else {
      const fallbackAcc = generateSequentialAccount(selectedBoxForDetails);
      setNewClientAccount(fallbackAcc);
      const matched = STATIC_SUBSCRIBERS_DIRECTORY.find(
        (s) => s.accountNumber.toUpperCase() === fallbackAcc.toUpperCase(),
      );
      if (matched) {
        setNewClientName(matched.name);
        setMatchedSubscriber(matched);
      } else {
        setNewClientName("");
        setMatchedSubscriber(null);
      }
    }

    setIsClientPortDropdownOpen(false);
    setIsSubscriberDirectoryOpen(false);
    setDirectorySearchQuery("");
    setIsAddClientModalOpen(true);
  };

  const handleSaveNewClient = () => {
    if (!selectedBoxForDetails) return;
    if (!newClientName.trim()) {
      if (Platform.OS === "web") {
        window.alert("Please enter a customer or business name.");
      } else {
        Alert.alert(
          "Validation Error",
          "Please enter a customer or business name.",
        );
      }
      return;
    }
    if (!newClientAccount.trim()) {
      if (Platform.OS === "web") {
        window.alert("Please enter a subscriber account number.");
      } else {
        Alert.alert(
          "Validation Error",
          "Please enter a subscriber account number.",
        );
      }
      return;
    }

    const newClient: ClientConnection = {
      port: newClientPort,
      accountNumber: newClientAccount.trim().toUpperCase(),
      name: newClientName.trim(),
      status: "CONNECTED",
    };

    const updatedClients = [...selectedBoxForDetails.clients, newClient].sort(
      (a, b) => {
        const numA = parseInt(a.port.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.port.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      },
    );

    const updatedActivePorts = updatedClients.filter(
      (c) => c.status === "CONNECTED",
    ).length;

    const updatedBox: DistributionBox = {
      ...selectedBoxForDetails,
      clients: updatedClients,
      activePorts: updatedActivePorts,
    };

    setSelectedBoxForDetails(updatedBox);
    setBoxes((prev) =>
      prev.map((b) => (b.id === updatedBox.id ? updatedBox : b)),
    );
    setIsAddClientModalOpen(false);
  };

  const handleToggleClientStatus = (port: string) => {
    if (!selectedBoxForDetails) return;
    const updatedClients = selectedBoxForDetails.clients.map((c) => {
      if (c.port === port) {
        return {
          ...c,
          status: (c.status === "CONNECTED" ? "DISCONNECTED" : "CONNECTED") as
            | "CONNECTED"
            | "DISCONNECTED",
        };
      }
      return c;
    });

    const updatedActivePorts = updatedClients.filter(
      (c) => c.status === "CONNECTED",
    ).length;

    const updatedBox: DistributionBox = {
      ...selectedBoxForDetails,
      clients: updatedClients,
      activePorts: updatedActivePorts,
    };

    setSelectedBoxForDetails(updatedBox);
    setBoxes((prev) =>
      prev.map((b) => (b.id === updatedBox.id ? updatedBox : b)),
    );
  };

  const handleRemoveClient = (port: string) => {
    if (!selectedBoxForDetails) return;
    const updatedClients = selectedBoxForDetails.clients.filter(
      (c) => c.port !== port,
    );
    const updatedActivePorts = updatedClients.filter(
      (c) => c.status === "CONNECTED",
    ).length;

    const updatedBox: DistributionBox = {
      ...selectedBoxForDetails,
      clients: updatedClients,
      activePorts: updatedActivePorts,
    };

    setSelectedBoxForDetails(updatedBox);
    setBoxes((prev) =>
      prev.map((b) => (b.id === updatedBox.id ? updatedBox : b)),
    );
  };

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
    setNewMountingType("Utility Pole");
    setNewPoleNumber("");
    setNewPorts("24");
    setIsPortsDropdownOpen(false);
    setNewSelectedEquipment([
      "PLC Optical Splitter",
      "Fiber Optic Adapters / Couplers",
      "Splice Tray",
      "IP65/IP66 Weatherproof Enclosure",
    ]);
    setIsEquipmentDropdownOpen(false);
    setCustomEquipmentInput("");
    setEquipmentCatalogFilter("ALL");
    setIsRegisterModalOpen(true);
  };

  const handleCategoryChange = (cat: "MAIN_BOX" | "SUB_BOX") => {
    setNewCategory(cat);
    setNewCode(getNextBoxCode(cat, boxes));
    setIsPortsDropdownOpen(false);
    if (cat === "MAIN_BOX") {
      setNewPorts("48");
      setNewSelectedEquipment([
        "Fiber Optic Adapters / Couplers",
        "Splice Tray",
        "Mid-span Access Ports / Main Cable Entry",
        "IP65/IP66 Weatherproof Enclosure",
      ]);
    } else {
      setNewPorts("24");
      setNewSelectedEquipment([
        "PLC Optical Splitter",
        "Fiber Optic Adapters / Couplers",
        "Splice Tray",
        "IP65/IP66 Weatherproof Enclosure",
      ]);
    }
  };

  const handleToggleEquipment = (eqName: string) => {
    if (newSelectedEquipment.includes(eqName)) {
      setNewSelectedEquipment(
        newSelectedEquipment.filter((item) => item !== eqName),
      );
    } else {
      setNewSelectedEquipment([...newSelectedEquipment, eqName]);
    }
  };

  const handleAddCustomEquipment = () => {
    const trimmed = customEquipmentInput.trim();
    if (!trimmed) return;
    if (!newSelectedEquipment.includes(trimmed)) {
      setNewSelectedEquipment([...newSelectedEquipment, trimmed]);
    }
    setCustomEquipmentInput("");
  };

  const handleRemoveEquipment = (eqName: string) => {
    setNewSelectedEquipment(
      newSelectedEquipment.filter((item) => item !== eqName),
    );
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
      (box.poleNumber && box.poleNumber.toLowerCase().includes(query)) ||
      (box.mountingType && box.mountingType.toLowerCase().includes(query)) ||
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
          bg: "bg-[#AEAC78]/30 border border-[#AEAC78]/80",
          dot: "bg-[#AEAC78]",
          text: "text-[#2d3416]",
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

    const constructedEquipment =
      newSelectedEquipment.length > 0
        ? newSelectedEquipment.map((eqName, idx) => {
            const matched = STANDARD_HARDWARE_CATALOG.find(
              (c) => c.name === eqName,
            );
            return {
              id: `eq-${Date.now()}-${idx}`,
              name: eqName,
              type: matched?.type || "Equipment",
              serial: `SN-${eqName
                .slice(0, 3)
                .toUpperCase()
                .replace(
                  /[^A-Z]/g,
                  "EQ",
                )}-${Math.floor(1000 + Math.random() * 9000)}`,
              status: "OPERATIONAL" as const,
            };
          })
        : [
            {
              id: `eq-${Date.now()}-1`,
              name:
                newCategory === "MAIN_BOX"
                  ? "Fiber Optic Adapters / Couplers"
                  : "PLC Optical Splitter",
              type: newCategory === "MAIN_BOX" ? "Adapter" : "Splitter",
              serial: `SN-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
              status: "OPERATIONAL" as const,
            },
          ];

    const newBox: DistributionBox = {
      id: `${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      category: newCategory,
      parentCode: newCategory === "SUB_BOX" ? newParentCode : undefined,
      siteName: newSiteName.trim(),
      address: newAddress.trim(),
      mountingType: newMountingType,
      poleNumber: newPoleNumber.trim() || undefined,
      latitude: 8.23 + (Math.random() * 0.02 - 0.01),
      longitude: 124.245 + (Math.random() * 0.02 - 0.01),
      status: "NEEDS_TAG",
      totalPorts: parseInt(newPorts, 10) || 24,
      activePorts: 0,
      qrToken: `QRTECH-BOX-${newCode.trim().toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      lastScanned: "Never (New Registration)",
      notes:
        newSelectedEquipment.length > 0
          ? `Installed Hardware: ${newSelectedEquipment.join(", ")}`
          : "Standard distribution enclosure. QR tag pending physical dispatch.",
      equipment: constructedEquipment,
      clients: [],
    };

    setBoxes([newBox, ...boxes]);
    setIsRegisterModalOpen(false);

    // Reset Form
    setNewCode("");
    setNewSiteName("");
    setNewAddress("");
    setNewMountingType("Utility Pole");
    setNewPoleNumber("");
    setNewPorts("24");
    setIsPortsDropdownOpen(false);
    setNewSelectedEquipment([]);
    setIsEquipmentDropdownOpen(false);
    setCustomEquipmentInput("");

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
            showsVerticalScrollIndicator={true}
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
                  { id: "MAIN_BOX", label: "Main Boxes" },
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
                    <View className="flex-[1.4] min-w-[140px] pr-2">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Box Code & Tier
                      </Text>
                    </View>
                    <View className="flex-[2.2] min-w-[210px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Site Location & Address
                      </Text>
                    </View>
                    <View className="flex-[1.2] min-w-[120px] px-2 items-center justify-center">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider text-center">
                        Status
                      </Text>
                    </View>
                    <View className="flex-[1.5] min-w-[150px] px-2 items-center justify-center">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider text-center">
                        Mounting Type
                      </Text>
                    </View>
                    <View className="flex-[1.2] min-w-[120px] pr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider">
                        Port Usage
                      </Text>
                    </View>
                    <View className="flex-[2.1] min-w-[200px] px-2 items-center justify-center">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider text-center">
                        Pole Tag / Landmark Reference
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
                        <View className="flex-[1.2] min-w-[130px] px-2 items-center justify-center">
                          <View
                            className={`inline-flex self-center px-2.5 py-1 rounded-lg flex-row items-center ${statusMeta.bg}`}
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

                        {/* 4. Mounting Type */}
                        <View className="flex-[1.5] min-w-[150px] px-2 items-center justify-center">
                          <View className="inline-flex self-center bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg flex-row items-center">
                            <Ionicons
                              name={
                                (box.mountingType || "Utility Pole") ===
                                "Utility Pole"
                                  ? "git-commit-outline"
                                  : (box.mountingType || "Utility Pole") ===
                                      "Wall Mount"
                                    ? "business-outline"
                                    : "cube-outline"
                              }
                              size={12}
                              color="#4d6029"
                            />
                            <Text className="text-xs font-poppins-semibold text-[#0f172a] ml-1.5">
                              {box.mountingType || "Utility Pole"}
                            </Text>
                          </View>
                        </View>

                        {/* 5. Port Usage */}
                        <View className="flex-[1.2] min-w-[120px] pr-3">
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

                        {/* 6. Pole Tag / Landmark Reference */}
                        <View className="flex-[2.1] min-w-[200px] px-2 items-center justify-center">
                          <Text
                            className="text-xs font-poppins-bold text-[#0f172a] text-center"
                            numberOfLines={1}
                          >
                            {box.poleNumber || "Pole #ILG-PL-01"}
                          </Text>
                          <Text
                            className="text-[10px] font-poppins text-[#64748b] mt-0.5 text-center"
                            numberOfLines={1}
                          >
                            {box.siteName.split("/")[0].trim()}
                          </Text>
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
                          ? "🏢 Main Distribution Box"
                          : "🔀 Sub-Distribution Box"}
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
                <View className="flex-row flex-wrap items-center gap-y-1 gap-x-2 mt-1.5">
                  <View className="flex-row items-center flex-1 min-w-[180px]">
                    <Ionicons name="location" size={13} color="#4d6029" />
                    <Text
                      className="text-xs font-poppins-medium text-[#475569] ml-1"
                      numberOfLines={1}
                    >
                      {selectedBoxForDetails.address}
                    </Text>
                  </View>

                  {selectedBoxForDetails.poleNumber && (
                    <View className="flex-row items-center bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      <Ionicons
                        name="pricetag-outline"
                        size={11}
                        color="#b45309"
                      />
                      <Text className="text-[10px] font-poppins-semibold text-amber-800 ml-1">
                        {selectedBoxForDetails.poleNumber}
                      </Text>
                    </View>
                  )}

                  {selectedBoxForDetails.mountingType && (
                    <View className="flex-row items-center bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      <Ionicons name="cube-outline" size={11} color="#64748b" />
                      <Text className="text-[10px] font-poppins-medium text-[#475569] ml-1">
                        {selectedBoxForDetails.mountingType}
                      </Text>
                    </View>
                  )}

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
                    <View className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                      <View className="flex-row items-center justify-between mb-2">
                        <View>
                          <Text className="text-xs font-poppins-bold text-[#0f172a]">
                            Port Allocation: {selectedBoxForDetails.activePorts}{" "}
                            of {selectedBoxForDetails.totalPorts} Ports Active
                          </Text>
                          <Text className="text-[11px] font-poppins text-[#64748b]">
                            {selectedBoxForDetails.totalPorts -
                              selectedBoxForDetails.activePorts}{" "}
                            Ports Available for Drops
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={handleOpenAddClientModal}
                          className="bg-[#4d6029] px-3 py-2 rounded-xl flex-row items-center shadow-xs"
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="person-add"
                            size={13}
                            color="#ffffff"
                          />
                          <Text className="text-xs font-poppins-bold text-white ml-1.5">
                            + Connect Subscriber
                          </Text>
                        </TouchableOpacity>
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
                            c.port.toLowerCase().includes(query),
                        );

                      if (selectedBoxForDetails.clients.length === 0) {
                        return (
                          <View className="py-10 items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <Ionicons
                              name="people-outline"
                              size={36}
                              color="#cbd5e1"
                            />
                            <Text className="text-xs font-poppins-semibold text-[#64748b] mt-2">
                              No subscribers connected to this box yet.
                            </Text>
                            <TouchableOpacity
                              onPress={handleOpenAddClientModal}
                              className="mt-3 bg-[#4d6029] px-4 py-2 rounded-xl flex-row items-center"
                              activeOpacity={0.8}
                            >
                              <Ionicons name="add" size={15} color="#ffffff" />
                              <Text className="text-xs font-poppins-bold text-white ml-1">
                                Connect First Subscriber
                              </Text>
                            </TouchableOpacity>
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
                          {filteredClients.map((client) => {
                            const isConnected = client.status === "CONNECTED";
                            return (
                              <View
                                key={client.port}
                                className={`p-3.5 rounded-2xl border flex-row items-center justify-between mb-2 ${
                                  isConnected
                                    ? "bg-slate-50 border-slate-200/70"
                                    : "bg-rose-50/40 border-rose-200/70"
                                }`}
                              >
                                <View className="flex-row items-center flex-1 mr-2">
                                  <View
                                    className={`w-16 bg-white border py-1.5 rounded-xl items-center justify-center mr-3 shadow-xs ${
                                      isConnected
                                        ? "border-slate-200"
                                        : "border-rose-200"
                                    }`}
                                  >
                                    <Text
                                      className={`text-xs font-poppins-bold ${
                                        isConnected
                                          ? "text-[#0f172a]"
                                          : "text-rose-700"
                                      }`}
                                    >
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
                                      className="text-[11px] font-mono font-poppins-semibold text-[#64748b]"
                                      numberOfLines={1}
                                    >
                                      {client.accountNumber}
                                    </Text>
                                  </View>
                                </View>

                                <View className="flex-row items-center space-x-1.5">
                                  {/* Toggle Active / Disconnected */}
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleToggleClientStatus(client.port)
                                    }
                                    className={`px-2.5 py-1 rounded-lg border mr-1.5 flex-row items-center ${
                                      isConnected
                                        ? "bg-[#AEAC78]/35 border-[#AEAC78]/80"
                                        : "bg-rose-100 border-rose-200"
                                    }`}
                                    activeOpacity={0.7}
                                    accessibilityLabel={`Toggle status for ${client.name}`}
                                  >
                                    <View
                                      className={`w-2 h-2 rounded-full mr-1.5 ${
                                        isConnected
                                          ? "bg-[#AEAC78]"
                                          : "bg-rose-500"
                                      }`}
                                    />
                                    <Text
                                      className={`text-[10px] font-poppins-bold ${
                                        isConnected
                                          ? "text-[#2d3416]"
                                          : "text-rose-800"
                                      }`}
                                    >
                                      {isConnected
                                        ? "Connected"
                                        : "Disconnected"}
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Unassign / Delete Port Connection */}
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleRemoveClient(client.port)
                                    }
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100"
                                    activeOpacity={0.7}
                                    accessibilityLabel={`Remove subscriber ${client.name}`}
                                  >
                                    <Ionicons
                                      name="trash-outline"
                                      size={14}
                                      color="#dc2626"
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
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
                                : "bg-[#4d6029]"
                            }`}
                          >
                            <MaterialCommunityIcons
                              name="cpu-64-bit"
                              size={18}
                              color={
                                eq.status === "FAULTY" ? "#dc2626" : "#ffffff"
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
                          className={`px-2.5 py-1 rounded-lg border ${
                            eq.status === "FAULTY"
                              ? "bg-rose-100 border-rose-200"
                              : "bg-[#AEAC78]/30 border-[#AEAC78]/80"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-poppins-bold ${
                              eq.status === "FAULTY"
                                ? "text-rose-800"
                                : "text-[#2d3416]"
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

                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedBoxForDetails(null);
                      setModalClientSearch("");
                    }}
                    className="px-5 py-2.5 bg-slate-200 rounded-xl"
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
                      onPress={() => handleCategoryChange("MAIN_BOX")}
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
                        Main Distribution Box
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCategoryChange("SUB_BOX")}
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
                        Sub-Distribution Box
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
                    Site Location / Site Name:
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
                    Street Address:
                  </Text>
                  <TextInput
                    placeholder="e.g. National Highway, Suarez, Iligan City"
                    placeholderTextColor="#94a3b8"
                    value={newAddress}
                    onChangeText={setNewAddress}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-poppins-medium text-[#0f172a]"
                  />
                </View>

                {/* Mounting Type Selector */}
                <View className="mt-3">
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                    Mounting Type:
                  </Text>
                  <View className="flex-row gap-2">
                    {[
                      {
                        id: "Utility Pole",
                        label: "Utility Pole",
                        icon: "git-commit-outline",
                      },
                      {
                        id: "Wall Mount",
                        label: "Wall Mount",
                        icon: "business-outline",
                      },
                      {
                        id: "Cabinet",
                        label: "Cabinet / Ground",
                        icon: "cube-outline",
                      },
                    ].map((m) => {
                      const isSelected = newMountingType === m.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() =>
                            setNewMountingType(
                              m.id as "Utility Pole" | "Wall Mount" | "Cabinet",
                            )
                          }
                          className={`flex-1 py-2 rounded-xl border flex-row items-center justify-center ${
                            isSelected
                              ? "bg-[#4d6029] border-[#4d6029]"
                              : "bg-slate-50 border-slate-200"
                          }`}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={m.icon as any}
                            size={14}
                            color={isSelected ? "#ffffff" : "#64748b"}
                          />
                          <Text
                            className={`text-[11px] ml-1.5 ${
                              isSelected
                                ? "text-white font-poppins-bold"
                                : "text-[#475569] font-poppins-medium"
                            }`}
                          >
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Pole / Landmark Reference Number */}
                <View className="mt-3">
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1">
                    Pole Tag / Landmark Reference:
                  </Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#94a3b8"
                    />
                    <TextInput
                      placeholder="e.g. Pole #ILG-PL-42 / Near Barangay Hall"
                      placeholderTextColor="#94a3b8"
                      value={newPoleNumber}
                      onChangeText={setNewPoleNumber}
                      className="flex-1 ml-2 text-xs font-poppins-medium text-[#0f172a]"
                    />
                  </View>
                </View>

                {/* Port Capacity Dropdown */}
                <View className="mt-3">
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                    Total Optical / Terminal Ports:
                  </Text>

                  {/* Dropdown Toggle Trigger Button */}
                  <TouchableOpacity
                    onPress={() => setIsPortsDropdownOpen(!isPortsDropdownOpen)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <MaterialCommunityIcons
                        name="server-network"
                        size={16}
                        color="#4d6029"
                      />
                      <Text className="text-xs font-poppins-semibold text-[#0f172a] ml-2">
                        {newPorts} Ports
                      </Text>
                    </View>
                    <Ionicons
                      name={isPortsDropdownOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  {/* Expanded Dropdown Options Panel */}
                  {isPortsDropdownOpen && (
                    <View className="mt-1.5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      {["8", "16", "24", "32", "48"].map((port, idx, arr) => {
                        const isSelected = newPorts === port;
                        return (
                          <TouchableOpacity
                            key={port}
                            onPress={() => {
                              setNewPorts(port);
                              setIsPortsDropdownOpen(false);
                            }}
                            className={`flex-row items-center justify-between px-3.5 py-2.5 ${
                              idx < arr.length - 1
                                ? "border-b border-slate-100"
                                : ""
                            } ${
                              isSelected
                                ? "bg-[#AEAC78]/25"
                                : "bg-white hover:bg-slate-50"
                            }`}
                            activeOpacity={0.7}
                          >
                            <View className="flex-row items-center flex-1 mr-2">
                              <View
                                className={`w-2 h-2 rounded-full mr-2.5 ${
                                  isSelected ? "bg-[#4d6029]" : "bg-slate-300"
                                }`}
                              />
                              <Text
                                className={`text-xs ${
                                  isSelected
                                    ? "font-poppins-bold text-[#4d6029]"
                                    : "font-poppins-medium text-[#1e293b]"
                                }`}
                              >
                                {port} Ports
                              </Text>
                            </View>
                            {isSelected ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color="#4d6029"
                              />
                            ) : (
                              <View className="w-4 h-4 rounded-full border border-slate-200" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Hardware Equipment Multi-Select Dropdown Section */}
                <View className="mt-3">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-poppins-semibold text-[#475569]">
                      Hardware Equipment:
                    </Text>
                    <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-poppins-bold text-[#2d3416]">
                        {newSelectedEquipment.length} item
                        {newSelectedEquipment.length === 1 ? "" : "s"} assigned
                      </Text>
                    </View>
                  </View>

                  {/* Dropdown Toggle Trigger Button */}
                  <TouchableOpacity
                    onPress={() =>
                      setIsEquipmentDropdownOpen(!isEquipmentDropdownOpen)
                    }
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <MaterialCommunityIcons
                        name="chip"
                        size={16}
                        color="#4d6029"
                      />
                      <Text className="text-xs font-poppins-medium text-[#0f172a] ml-2">
                        {isEquipmentDropdownOpen
                          ? "Hide Equipment Catalog"
                          : "+ Select / Add Equipment from Catalog"}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        isEquipmentDropdownOpen ? "chevron-up" : "chevron-down"
                      }
                      size={16}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  {/* Expanded Dropdown Catalog Panel */}
                  {isEquipmentDropdownOpen && (
                    <View className="mt-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-xs">
                      {/* Catalog Category Filter Tabs */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-3"
                        contentContainerStyle={{
                          flexDirection: "row",
                          gap: 6,
                          alignItems: "center",
                          paddingLeft: 2,
                          paddingRight: 20,
                          paddingVertical: 2,
                        }}
                      >
                        {[
                          "ALL",
                          "Optical Equipment",
                          "Circuit / Internal Management",
                          "Distribution Hardware",
                          "Protection Hardware",
                        ].map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => setEquipmentCatalogFilter(cat)}
                            className={`px-2.5 py-1 rounded-xl border ${
                              equipmentCatalogFilter === cat
                                ? "bg-[#4d6029] border-[#4d6029] shadow-xs"
                                : "bg-white border-slate-200 shadow-xs"
                            }`}
                            activeOpacity={0.7}
                          >
                            <Text
                              className={`text-[11px] ${
                                equipmentCatalogFilter === cat
                                  ? "text-white font-poppins-bold"
                                  : "text-[#64748b] font-poppins-medium"
                              }`}
                            >
                              {cat === "ALL"
                                ? "All"
                                : cat === "Optical Equipment"
                                  ? "Optical"
                                  : cat === "Circuit / Internal Management"
                                    ? "Circuit"
                                    : cat === "Distribution Hardware"
                                      ? "Distribution"
                                      : "Protection"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {/* Equipment Item Checklist */}
                      <ScrollView
                        className="max-h-56"
                        contentContainerStyle={{ paddingVertical: 2 }}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {STANDARD_HARDWARE_CATALOG.filter(
                          (item) =>
                            equipmentCatalogFilter === "ALL" ||
                            item.category === equipmentCatalogFilter,
                        ).map((item) => {
                          const isSelected = newSelectedEquipment.includes(
                            item.name,
                          );
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => handleToggleEquipment(item.name)}
                              className="flex-row items-center justify-between p-2.5 rounded-xl border bg-white border-slate-200/80 mb-2"
                              activeOpacity={0.7}
                            >
                              <View className="flex-row items-center flex-1 mr-2">
                                <Ionicons
                                  name={
                                    isSelected ? "checkbox" : "square-outline"
                                  }
                                  size={18}
                                  color={isSelected ? "#4d6029" : "#94a3b8"}
                                />
                                <Text className="text-xs ml-2.5 font-poppins-medium text-[#0f172a]">
                                  {item.name}
                                </Text>
                              </View>
                              <View className="bg-slate-100 px-2 py-0.5 rounded">
                                <Text className="text-[9px] font-poppins text-[#64748b]">
                                  {item.category === "Optical Equipment"
                                    ? "Optical"
                                    : item.category ===
                                        "Circuit / Internal Management"
                                      ? "Circuit"
                                      : item.category ===
                                          "Distribution Hardware"
                                        ? "Distribution"
                                        : "Protection"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Assigned Hardware Tag Pills */}
                  <View className="mt-2.5">
                    <Text className="text-[11px] font-poppins-semibold text-[#64748b] mb-1.5">
                      Assigned Hardware for this Box:
                    </Text>

                    {newSelectedEquipment.length === 0 ? (
                      <View className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl items-center">
                        <Text className="text-xs font-poppins text-[#94a3b8]">
                          No hardware assigned yet. Click dropdown above to
                          select.
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap -mx-1">
                        {newSelectedEquipment.map((eqName, idx) => (
                          <View key={idx} className="w-1/2 px-1 mb-2">
                            <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 rounded-xl px-2.5 py-2 flex-row items-center justify-between shadow-2xs h-full">
                              <View className="flex-row items-center flex-1 mr-1.5">
                                <Ionicons
                                  name="checkmark-circle"
                                  size={13}
                                  color="#4d6029"
                                />
                                <Text
                                  className="text-xs font-poppins-semibold text-[#1e293b] ml-1.5 flex-1"
                                  numberOfLines={1}
                                >
                                  {eqName}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleRemoveEquipment(eqName)}
                                className="w-4 h-4 rounded-full bg-[#AEAC78]/50 hover:bg-[#AEAC78]/80 items-center justify-center shrink-0"
                                accessibilityLabel={`Remove ${eqName}`}
                              >
                                <Ionicons
                                  name="close"
                                  size={10}
                                  color="#2d3416"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Custom Hardware Write-In Row */}
                  <View className="mt-2.5">
                    <Text className="text-[11px] font-poppins-semibold text-[#64748b] mb-1">
                      + Add Custom / Unlisted Hardware:
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        placeholder="e.g. 12V 50W Solar Inverter, Optical Splicer"
                        placeholderTextColor="#94a3b8"
                        value={customEquipmentInput}
                        onChangeText={setCustomEquipmentInput}
                        onSubmitEditing={handleAddCustomEquipment}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-poppins-medium text-[#0f172a]"
                      />
                      <TouchableOpacity
                        onPress={handleAddCustomEquipment}
                        className={`px-3.5 py-2.5 rounded-xl flex-row items-center ${
                          customEquipmentInput.trim()
                            ? "bg-[#4d6029]"
                            : "bg-slate-200"
                        }`}
                        disabled={!customEquipmentInput.trim()}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={14} color="#ffffff" />
                        <Text className="text-xs font-poppins-bold text-white ml-1">
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
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
                    ? "MAIN DISTRIBUTION BOX"
                    : "SUB-DISTRIBUTION BOX"}
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
      {/* MODAL 4: CONNECT NEW SUBSCRIBER */}
      {isAddClientModalOpen && selectedBoxForDetails && (
        <Modal
          visible={isAddClientModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAddClientModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh]">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3">
                    <Ionicons name="person-add" size={20} color="#4d6029" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-poppins-bold text-[#0f172a]">
                      Connect Subscriber
                    </Text>
                    <Text
                      className="text-xs font-poppins text-[#64748b]"
                      numberOfLines={1}
                    >
                      {selectedBoxForDetails.code} ·{" "}
                      {selectedBoxForDetails.siteName}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAddClientModalOpen(false)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView
                className="py-4 space-y-4"
                showsVerticalScrollIndicator={false}
              >
                {/* Box Context Card */}
                <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 mb-3 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="cube-outline"
                      size={18}
                      color="#4d6029"
                    />
                    <Text className="text-xs font-poppins-semibold text-[#0f172a] ml-1.5">
                      Target Box:{" "}
                      <Text className="font-poppins-bold text-[#4d6029]">
                        {selectedBoxForDetails.code}
                      </Text>
                    </Text>
                  </View>
                  <View className="bg-[#FCF0DA] border border-[#edd5a6] px-2.5 py-0.5 rounded-lg">
                    <Text className="text-[10px] font-poppins-bold text-[#78350f]">
                      {getAvailablePorts(selectedBoxForDetails).length} Ports
                      Available
                    </Text>
                  </View>
                </View>

                {/* 1. Port Selection Dropdown */}
                <View className="mb-3.5">
                  <Text className="text-xs font-poppins-bold text-[#0f172a] mb-1.5">
                    Assign Optical Port *
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setIsClientPortDropdownOpen(!isClientPortDropdownOpen)
                    }
                    className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
                    activeOpacity={0.75}
                  >
                    <View className="flex-row items-center">
                      <MaterialCommunityIcons
                        name="ethernet"
                        size={18}
                        color="#4d6029"
                      />
                      <Text className="text-xs font-poppins-bold text-[#0f172a] ml-2">
                        {newClientPort || "Select an available port..."}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        isClientPortDropdownOpen ? "chevron-up" : "chevron-down"
                      }
                      size={16}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  {/* Available Port Grid Selector */}
                  {isClientPortDropdownOpen && (
                    <View className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[11px] font-poppins-semibold text-[#64748b]">
                          Select an available port (
                          {getAvailablePorts(selectedBoxForDetails).length}{" "}
                          free):
                        </Text>
                      </View>
                      <ScrollView
                        className="max-h-44"
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        <View className="flex-row flex-wrap gap-1.5 pb-1">
                          {getAvailablePorts(selectedBoxForDetails).map(
                            (port) => (
                              <TouchableOpacity
                                key={port}
                                onPress={() => {
                                  setNewClientPort(port);
                                  setIsClientPortDropdownOpen(false);
                                }}
                                className={`px-3 py-1.5 rounded-xl border ${
                                  newClientPort === port
                                    ? "bg-[#4d6029] border-[#4d6029]"
                                    : "bg-white border-slate-200"
                                }`}
                              >
                                <Text
                                  className={`text-xs font-poppins-semibold ${
                                    newClientPort === port
                                      ? "text-white"
                                      : "text-[#0f172a]"
                                  }`}
                                >
                                  {port}
                                </Text>
                              </TouchableOpacity>
                            ),
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 2. Account Number Input with Auto-Detection & Directory Picker */}
                <View className="mb-3.5">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Subscriber Account Number *
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setIsSubscriberDirectoryOpen(!isSubscriberDirectoryOpen)
                      }
                      className="flex-row items-center"
                    >
                      <Ionicons
                        name="folder-open-outline"
                        size={13}
                        color="#4d6029"
                      />
                      <Text className="text-[11px] font-poppins-semibold text-[#4d6029] ml-1">
                        {isSubscriberDirectoryOpen
                          ? "Close Directory"
                          : "Browse Directory"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1">
                    <Ionicons
                      name="barcode-outline"
                      size={16}
                      color="#64748b"
                    />
                    <TextInput
                      value={newClientAccount}
                      onChangeText={handleAccountChange}
                      placeholder="e.g. ACC-ILG-015 or ACC-IIT-006"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                      className="flex-1 ml-2 text-xs font-mono font-poppins-semibold text-[#0f172a] py-2"
                    />
                    {matchedSubscriber && (
                      <View className="bg-[#FCF0DA] border border-[#edd5a6] px-2 py-0.5 rounded flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#4d6029"
                        />
                        <Text className="text-[10px] font-poppins-bold text-[#78350f] ml-1">
                          Matched
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Expandable Directory Browser */}
                  {isSubscriberDirectoryOpen && (
                    <View className="mt-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-56">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[11px] font-poppins-bold text-[#0f172a]">
                          Central Billing Directory (
                          {STATIC_SUBSCRIBERS_DIRECTORY.length} records)
                        </Text>
                        <Text className="text-[10px] font-poppins text-[#64748b]">
                          Tap to auto-fill
                        </Text>
                      </View>

                      <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1 mb-2">
                        <Ionicons name="search" size={13} color="#94a3b8" />
                        <TextInput
                          value={directorySearchQuery}
                          onChangeText={setDirectorySearchQuery}
                          placeholder="Search directory by name, account #, or plan..."
                          placeholderTextColor="#94a3b8"
                          className="flex-1 ml-2 text-xs font-poppins text-[#0f172a] py-1"
                        />
                        {directorySearchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setDirectorySearchQuery("")}
                          >
                            <Ionicons
                              name="close-circle"
                              size={14}
                              color="#94a3b8"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      <ScrollView
                        className="max-h-36 space-y-1.5"
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {STATIC_SUBSCRIBERS_DIRECTORY.filter((s) => {
                          const q = directorySearchQuery.toLowerCase().trim();
                          return (
                            q === "" ||
                            s.name.toLowerCase().includes(q) ||
                            s.accountNumber.toLowerCase().includes(q) ||
                            s.plan.toLowerCase().includes(q) ||
                            s.category.toLowerCase().includes(q)
                          );
                        }).map((sub) => {
                          const isCurrentlySelected =
                            newClientAccount.toUpperCase() ===
                            sub.accountNumber.toUpperCase();
                          return (
                            <TouchableOpacity
                              key={sub.accountNumber}
                              onPress={() => handleSelectFromDirectory(sub)}
                              className={`p-2 rounded-xl border flex-row items-center justify-between mb-1 ${
                                isCurrentlySelected
                                  ? "bg-[#FCF0DA] border-[#edd5a6]"
                                  : "bg-white border-slate-200/80"
                              }`}
                              activeOpacity={0.7}
                            >
                              <View className="flex-1 mr-2">
                                <View className="flex-row items-center">
                                  <Text className="text-xs font-mono font-poppins-bold text-[#4d6029] mr-2">
                                    {sub.accountNumber}
                                  </Text>
                                  <Text
                                    className="text-xs font-poppins-bold text-[#0f172a] flex-1"
                                    numberOfLines={1}
                                  >
                                    {sub.name}
                                  </Text>
                                </View>
                                <Text
                                  className="text-[10px] font-poppins text-[#64748b]"
                                  numberOfLines={1}
                                >
                                  {sub.category}
                                </Text>
                              </View>
                              <View className="bg-slate-100 px-2 py-0.5 rounded">
                                <Text className="text-[9px] font-poppins-semibold text-[#475569]">
                                  {sub.status === "ACTIVE"
                                    ? "Active"
                                    : "Pending"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 3. Customer / Entity Name */}
                <View className="mb-3.5">
                  <Text className="text-xs font-poppins-bold text-[#0f172a] mb-1.5">
                    Subscriber / Entity Name *
                  </Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1">
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                    <TextInput
                      value={newClientName}
                      onChangeText={setNewClientName}
                      placeholder="e.g. Juan Dela Cruz, Iligan Bank Corp."
                      placeholderTextColor="#94a3b8"
                      className="flex-1 ml-2 text-xs font-poppins-medium text-[#0f172a] py-2"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="flex-row space-x-2 pt-4 border-t border-slate-100">
                <TouchableOpacity
                  onPress={handleSaveNewClient}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row shadow-sm mr-2"
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                  <Text className="text-white text-xs font-poppins-bold ml-1.5">
                    Connect & Activate
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsAddClientModalOpen(false)}
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
    </SafeAreaView>
  );
}
