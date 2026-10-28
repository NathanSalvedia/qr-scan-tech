import {
  SidebarNavigation,
  useSidebarCollapse,
} from "@/components/sidebar-navigation";
import { STANDARD_HARDWARE_CATALOG } from "@/constants/distribution-boxes";
import { boxService } from "@/services/boxes";
import { SubscriberRecord, subscriberService } from "@/services/subscribers";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  status: "OPERATIONAL" | "FAULTY" | "SPARE";
}

export interface ClientConnection {
  port: string;
  accountNumber: string;
  name: string;
  clientType?: "Commercial" | "Residential" | string;
  plan?: string;
  status: "CONNECTED" | "DISCONNECTED";
}

export const AVAILABLE_SUBSCRIBER_PLANS = [
  {
    name: "50 Mbps Fiber Plan",
    category: "Residential" as const,
    speed: "50 Mbps",
    description: "Standard 50 Mbps residential fiber connection",
  },
  {
    name: "70 Mbps Fiber Plan",
    category: "Residential" as const,
    speed: "70 Mbps",
    description: "High-speed 70 Mbps home streaming & browsing",
  },
  {
    name: "100 Mbps Fiber Plan",
    category: "Residential" as const,
    speed: "100 Mbps",
    description: "Fast 100 Mbps family fiber connection",
  },
  {
    name: "200 Mbps Fiber Plan",
    category: "Residential" as const,
    speed: "200 Mbps",
    description: "High-speed 200 Mbps streaming & gaming tier",
  },
  {
    name: "300 Mbps Fiber Plan",
    category: "Residential" as const,
    speed: "300 Mbps",
    description: "Ultra-fast 300 Mbps low-latency fiber tier",
  },
  {
    name: "50 Mbps Fiber Plan",
    category: "Commercial" as const,
    speed: "50 Mbps",
    description: "50 Mbps commercial fiber plan",
  },
  {
    name: "70 Mbps Fiber Plan",
    category: "Commercial" as const,
    speed: "70 Mbps",
    description: "70 Mbps commercial fiber plan",
  },
  {
    name: "100 Mbps Fiber Plan",
    category: "Commercial" as const,
    speed: "100 Mbps",
    description: "100 Mbps commercial fiber plan",
  },
  {
    name: "200 Mbps Fiber Plan",
    category: "Commercial" as const,
    speed: "200 Mbps",
    description: "200 Mbps commercial fiber plan",
  },
  {
    name: "300 Mbps Fiber Plan",
    category: "Commercial" as const,
    speed: "300 Mbps",
    description: "300 Mbps commercial fiber plan",
  },
];

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

type CategoryFilter =
  | "ALL"
  | "MAIN_BOX"
  | "SUB_BOX"
  | "ACTIVE"
  | "NEEDS_TAG"
  | "ISSUE";

export default function BoxManagementScreen() {
  const [boxes, setBoxes] = useState<DistributionBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("ALL");
  const {
    isCollapsed: isSidebarCollapsed,
    toggleSidebar: toggleSidebarCollapse,
  } = useSidebarCollapse();

  const fetchBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await boxService.getAll();
      if (res.success && Array.isArray(res.boxes)) {
        const mapped: DistributionBox[] = res.boxes.map((b: any) => ({
          id: b.id,
          code: b.code,
          category: b.category,
          parentCode: b.parentCode || b.parent_code,
          siteName: b.siteName || b.site_name,
          address: b.address,
          mountingType: b.mountingType || b.mounting_type || "Utility Pole",
          poleNumber: b.poleNumber || b.pole_number || "",
          latitude: Number(b.latitude) || 8.232,
          longitude:
            Number(b.longitude) >= 20 && Number(b.longitude) <= 35
              ? Number(b.longitude) + 100
              : Number(b.longitude) || 124.248,
          status: b.status || "NEEDS_TAG",
          totalPorts: b.totalPorts || b.total_ports || 24,
          activePorts: Array.isArray(b.clients)
            ? b.clients.filter((c: any) => c.status === "CONNECTED").length
            : b.portsUsed || 0,
          equipment: Array.isArray(b.equipment)
            ? b.equipment
            : (b.equipmentItems || []).map((name: string, i: number) => ({
                id: `eq-${i}`,
                name,
                type: "Equipment",
                status: "OPERATIONAL",
              })),
          clients: Array.isArray(b.clients) ? b.clients : [],
          qrToken: b.qrToken || b.qr_token || `QRTECH-BOX-${b.code}`,
          lastScanned: b.lastScanned || b.last_scanned_at || "Never",
          notes: b.notes || "",
        }));
        setBoxes(mapped);
      } else {
        console.warn("[box-management] Failed to fetch boxes:", res.message);
        setBoxes([]);
      }
    } catch (err: any) {
      console.error("Failed to load boxes:", err);
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    boxService
      .getAll()
      .then((res) => {
        if (!active) return;
        if (res.success && Array.isArray(res.boxes)) {
          const mapped: DistributionBox[] = res.boxes.map((b: any) => ({
            id: b.id,
            code: b.code,
            category: b.category,
            parentCode: b.parentCode || b.parent_code,
            siteName: b.siteName || b.site_name,
            address: b.address,
            mountingType: b.mountingType || b.mounting_type || "Utility Pole",
            poleNumber: b.poleNumber || b.pole_number || "",
            latitude: Number(b.latitude) || 8.232,
            longitude:
              Number(b.longitude) >= 20 && Number(b.longitude) <= 35
                ? Number(b.longitude) + 100
                : Number(b.longitude) || 124.248,
            status: b.status || "NEEDS_TAG",
            totalPorts: b.totalPorts || b.total_ports || 24,
            activePorts: Array.isArray(b.clients)
              ? b.clients.filter((c: any) => c.status === "CONNECTED").length
              : b.portsUsed || 0,
            equipment: Array.isArray(b.equipment)
              ? b.equipment
              : (b.equipmentItems || []).map((name: string, i: number) => ({
                  id: `eq-${i}`,
                  name,
                  type: "Equipment",
                  status: "OPERATIONAL",
                })),
            clients: Array.isArray(b.clients) ? b.clients : [],
            qrToken: b.qrToken || b.qr_token || `QRTECH-BOX-${b.code}`,
            lastScanned: b.lastScanned || b.last_scanned_at || "Never",
            notes: b.notes || "",
          }));
          setBoxes(mapped);
        } else {
          console.warn("[box-management] Failed to fetch boxes:", res.message);
          setBoxes([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load boxes:", err);
        setBoxes([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Modals state
  const [selectedBoxForDetails, setSelectedBoxForDetails] =
    useState<DistributionBox | null>(null);
  const [selectedBoxForQR, setSelectedBoxForQR] =
    useState<DistributionBox | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<DistributionBox | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<
    "CLIENTS" | "EQUIPMENT" | "LOCATION" | "SCAN_LOGS"
  >("CLIENTS");
  const [modalClientSearch, setModalClientSearch] = useState("");

  // Form State for Registering New Box
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState<"MAIN_BOX" | "SUB_BOX">(
    "SUB_BOX",
  );
  const [newParentCode, setNewParentCode] = useState("");
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newMountingType, setNewMountingType] = useState<
    "Utility Pole" | "Wall Mount" | "Cabinet"
  >("Utility Pole");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingStatus, setGeocodingStatus] = useState<string | null>(null);
  const [newPorts, setNewPorts] = useState("");
  const [isPortsDropdownOpen, setIsPortsDropdownOpen] = useState(false);
  const [newSelectedEquipment, setNewSelectedEquipment] = useState<string[]>(
    [],
  );
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const [customEquipmentInput, setCustomEquipmentInput] = useState("");
  const [equipmentCatalogFilter, setEquipmentCatalogFilter] =
    useState<string>("ALL");

  // Connect New Client Modal State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientPort, setNewClientPort] = useState("");
  const [newClientAccount, setNewClientAccount] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientType, setNewClientType] = useState<
    "Residential" | "Commercial" | ""
  >("");
  const [isClientTypeDropdownOpen, setIsClientTypeDropdownOpen] =
    useState(false);
  const [newClientPlan, setNewClientPlan] = useState("");
  const [isClientPlanDropdownOpen, setIsClientPlanDropdownOpen] =
    useState(false);
  const [customPlanSpeed, setCustomPlanSpeed] = useState("");
  const [subscriberPlanFilter, setSubscriberPlanFilter] =
    useState<string>("ALL");

  const handleCustomPlanSpeedChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setCustomPlanSpeed(clean);
    if (clean) {
      setNewClientPlan(`${clean} Mbps Fiber Plan`);
    } else {
      setNewClientPlan("");
    }
  };
  const [isClientPortDropdownOpen, setIsClientPortDropdownOpen] =
    useState(false);
  const [matchedSubscriber, setMatchedSubscriber] = useState<any | null>(null);
  const [liveDirectory, setLiveDirectory] = useState<SubscriberRecord[]>([]);
  const [isSubscriberDirectoryOpen, setIsSubscriberDirectoryOpen] =
    useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState("");

  const extractPortNumber = (portVal: string | number): number => {
    if (typeof portVal === "number") return portVal;
    return parseInt(String(portVal).replace(/\D/g, ""), 10) || 0;
  };

  const formatPortLabel = (portNum: number): string =>
    `Port ${portNum < 10 ? "0" + portNum : portNum}`;

  const getAvailablePorts = (box: DistributionBox | null) => {
    if (!box) return [];
    const occupiedNums = new Set(
      box.clients.map((c) => extractPortNumber(c.port)).filter((n) => n > 0),
    );
    const available: string[] = [];
    for (let i = 1; i <= box.totalPorts; i++) {
      if (!occupiedNums.has(i)) {
        available.push(formatPortLabel(i));
      }
    }
    return available;
  };

  const getExistingSubscriberConnection = (accountNumber: string) => {
    const clean = String(accountNumber || "")
      .replace(/\D/g, "")
      .trim();
    if (!clean) return null;

    for (const b of boxes) {
      const found = b.clients.find(
        (c) =>
          String(c.accountNumber).replace(/\D/g, "") === clean ||
          String(c.accountNumber).trim().toUpperCase() ===
            String(accountNumber).trim().toUpperCase(),
      );
      if (found) {
        return {
          boxCode: b.code,
          port: formatPortLabel(extractPortNumber(found.port)),
          clientName: found.name,
        };
      }
    }

    const dirMatch = liveDirectory.find(
      (s: any) =>
        (String(s.accountNumber).replace(/\D/g, "") === clean ||
          s.accountNumber === accountNumber) &&
        s.status === "ACTIVE" &&
        (s.assignedPort || s.assignedBoxId),
    );
    if (dirMatch) {
      const matchedBox = boxes.find((b) => b.id === dirMatch.assignedBoxId);
      return {
        boxCode: matchedBox?.code || "Assigned Box",
        port: dirMatch.assignedPort
          ? formatPortLabel(extractPortNumber(dirMatch.assignedPort))
          : "Assigned Port",
        clientName: dirMatch.customerName || dirMatch.name,
      };
    }

    return null;
  };

  const handleAccountChange = async (acc: string) => {
    // Only accept numeric digits, up to 10 digits
    const clean = acc.replace(/\D/g, "").slice(0, 10);
    setNewClientAccount(clean);
    if (!clean) {
      setMatchedSubscriber(null);
      return;
    }

    // 1. Search in live directory from database
    const dirSource = liveDirectory;
    const matched = dirSource.find(
      (s: any) =>
        s.accountNumber === clean ||
        String(s.accountNumber).replace(/\D/g, "") === clean,
    );

    if (matched) {
      const subName = matched.customerName || matched.name;
      setNewClientName(subName);
      setMatchedSubscriber(matched);
      const cat = matched.subscriberType || matched.category;
      if (cat === "Commercial" || cat === "Residential") {
        setNewClientType(cat);
      } else if (
        cat === "Enterprise" ||
        cat === "Government" ||
        cat === "Academic"
      ) {
        setNewClientType("Commercial");
      }
      const planName = matched.servicePlan || matched.plan;
      if (planName) {
        setNewClientPlan(planName);
        const match = planName.match(/(\d+)\s*Mbps/i);
        if (match) {
          setCustomPlanSpeed(match[1]);
        } else {
          setCustomPlanSpeed("");
        }
      }
      return;
    }

    // 2. If 10 digits entered and not matched in local cache, query backend API
    if (clean.length === 10) {
      try {
        const lookup = await subscriberService.lookupSubscriber(clean);
        if (lookup.success && lookup.matched && lookup.subscriber) {
          const sub = lookup.subscriber;
          setNewClientName(sub.customerName || sub.name);
          setMatchedSubscriber(sub);
          const cat = sub.subscriberType || sub.category;
          if (cat === "Commercial" || cat === "Residential") {
            setNewClientType(cat as any);
          } else {
            setNewClientType("Commercial");
          }
          if (sub.servicePlan || sub.plan) {
            const planVal = sub.servicePlan || sub.plan;
            setNewClientPlan(planVal);
            const match = planVal.match(/(\d+)\s*Mbps/i);
            if (match) {
              setCustomPlanSpeed(match[1]);
            } else {
              setCustomPlanSpeed("");
            }
          }
          return;
        }
      } catch (err) {
        console.warn("Subscriber lookup error:", err);
      }
    }

    setMatchedSubscriber(null);
  };

  const handleSelectFromDirectory = (sub: any) => {
    const acc =
      String(sub.accountNumber).replace(/\D/g, "").slice(0, 10) ||
      sub.accountNumber;
    const existingConn = getExistingSubscriberConnection(acc);
    if (existingConn || sub.status === "ACTIVE") {
      return;
    }
    setNewClientAccount(acc);
    setNewClientName(sub.customerName || sub.name);
    setMatchedSubscriber(sub);
    const cat = sub.subscriberType || sub.category;
    if (cat === "Commercial" || cat === "Residential") {
      setNewClientType(cat);
    } else if (
      cat === "Enterprise" ||
      cat === "Government" ||
      cat === "Academic"
    ) {
      setNewClientType("Commercial");
    }
    const planName = sub.servicePlan || sub.plan;
    if (planName) {
      setNewClientPlan(planName);
      const match = planName.match(/(\d+)\s*Mbps/i);
      if (match) {
        setCustomPlanSpeed(match[1]);
      } else {
        setCustomPlanSpeed("");
      }
    }
    setIsSubscriberDirectoryOpen(false);
  };

  const handleOpenAddClientModal = async (presetPort?: string) => {
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
    const defaultPort =
      presetPort && available.includes(presetPort) ? presetPort : available[0];
    setNewClientPort(defaultPort);

    // Fetch live subscribers directory from backend in background for live matching & browsing
    try {
      const dirRes = await subscriberService.getAllSubscribers();
      if (dirRes.success && Array.isArray(dirRes.subscribers)) {
        setLiveDirectory(dirRes.subscribers);
      }
    } catch (e) {
      console.warn("Could not fetch live directory:", e);
    }

    // Input fields start completely empty for Admin input
    setNewClientAccount("");
    setNewClientName("");
    setMatchedSubscriber(null);
    setNewClientType("");
    setNewClientPlan("");
    setCustomPlanSpeed("");

    setIsClientPortDropdownOpen(false);
    setIsClientTypeDropdownOpen(false);
    setIsClientPlanDropdownOpen(false);
    setSubscriberPlanFilter("ALL");
    setIsSubscriberDirectoryOpen(false);
    setDirectorySearchQuery("");
    setIsAddClientModalOpen(true);
  };

  const handleQueueForFieldTech = () => {
    if (!newClientAccount.trim()) {
      const msg = "Please enter a 10-digit subscriber account number.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Validation Error", msg);
      }
      return;
    }
    if (!newClientName.trim()) {
      const msg = "Please enter a customer or business name.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Validation Error", msg);
      }
      return;
    }

    const existingSubscriberConn =
      getExistingSubscriberConnection(newClientAccount);
    if (existingSubscriberConn) {
      const msg = `Account ${newClientAccount.trim()} (${existingSubscriberConn.clientName}) is already connected on ${existingSubscriberConn.boxCode} · ${existingSubscriberConn.port}.`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Duplicate Subscriber Assignment", msg);
      }
      return;
    }

    if (!newClientType) {
      const msg = "Please select a Subscriber Type (Residential or Commercial).";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Validation Error", msg);
      }
      return;
    }

    const effectivePlan = customPlanSpeed.trim()
      ? `${customPlanSpeed.trim()} Mbps Fiber Plan`
      : newClientPlan;

    if (!effectivePlan) {
      const msg = "Please select a Subscriber Plan or enter a Custom Speed (Mbps).";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Validation Error", msg);
      }
      return;
    }

    const cleanAccount = newClientAccount.trim().toUpperCase();
    const cleanName = newClientName.trim();

    const queuedRecord = {
      accountNumber: cleanAccount,
      customerName: cleanName,
      name: cleanName,
      subscriberType: newClientType,
      category: newClientType,
      servicePlan: effectivePlan,
      plan: effectivePlan,
      status: "PENDING_PROVISIONING",
    };

    setLiveDirectory((prev) => {
      const filtered = prev.filter(
        (s) =>
          String(s.accountNumber).replace(/\D/g, "") !==
          cleanAccount.replace(/\D/g, ""),
      );
      return [queuedRecord, ...filtered];
    });

    handleCloseAddClientModal();

    subscriberService
      .createSubscriber({
        accountNumber: cleanAccount,
        customerName: cleanName,
        subscriberType: newClientType,
        servicePlan: effectivePlan,
        address: selectedBoxForDetails?.address,
      })
      .catch((err) => console.warn("Error queueing subscriber work order:", err));

    const confirmMsg = `${cleanName} (${cleanAccount}) has been queued in the Central Directory as a Pending Installation Work Order. Field Technicians can now assign their physical drop-wire port on-site.`;
    if (Platform.OS === "web") {
      window.alert(confirmMsg);
    } else {
      Alert.alert("Work Order Queued", confirmMsg);
    }
  };

  const handleSaveNewClient = () => {
    if (!selectedBoxForDetails) return;
    const targetPortNum = extractPortNumber(newClientPort);
    if (!targetPortNum) {
      if (Platform.OS === "web") {
        window.alert("Please select an available optical port.");
      } else {
        Alert.alert(
          "Validation Error",
          "Please select an available optical port.",
        );
      }
      return;
    }

    const alreadyOnTargetPort = selectedBoxForDetails.clients.find(
      (c) => extractPortNumber(c.port) === targetPortNum,
    );
    if (alreadyOnTargetPort) {
      const msg = `${formatPortLabel(targetPortNum)} is already occupied by ${alreadyOnTargetPort.name}. Please select an available port.`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Port Occupied", msg);
      }
      return;
    }

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

    const existingSubscriberConn =
      getExistingSubscriberConnection(newClientAccount);
    if (existingSubscriberConn) {
      const msg = `Account ${newClientAccount.trim()} (${existingSubscriberConn.clientName}) is already connected on ${existingSubscriberConn.boxCode} · ${existingSubscriberConn.port}.`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Duplicate Subscriber Assignment", msg);
      }
      return;
    }

    if (!newClientType) {
      if (Platform.OS === "web") {
        window.alert(
          "Please select a Subscriber Type (Residential or Commercial).",
        );
      } else {
        Alert.alert(
          "Validation Error",
          "Please select a Subscriber Type (Residential or Commercial).",
        );
      }
      return;
    }

    const effectivePlan = customPlanSpeed.trim()
      ? `${customPlanSpeed.trim()} Mbps Fiber Plan`
      : newClientPlan;

    if (!effectivePlan) {
      if (Platform.OS === "web") {
        window.alert(
          "Please select a Subscriber Plan or enter a Custom Speed (Mbps).",
        );
      } else {
        Alert.alert(
          "Validation Error",
          "Please select a Subscriber Plan or enter a Custom Speed (Mbps).",
        );
      }
      return;
    }

    const normalizedPortLabel = formatPortLabel(targetPortNum);
    const cleanAccount = newClientAccount.trim().toUpperCase();
    const cleanName = newClientName.trim();

    const newClient: ClientConnection = {
      port: normalizedPortLabel,
      accountNumber: cleanAccount,
      name: cleanName,
      clientType: newClientType,
      plan: effectivePlan,
      status: "CONNECTED",
    };

    const updatedClients = [...selectedBoxForDetails.clients, newClient].sort(
      (a, b) => extractPortNumber(a.port) - extractPortNumber(b.port),
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
    setLiveDirectory((prev) =>
      prev.map((s) =>
        String(s.accountNumber).replace(/\D/g, "") ===
          cleanAccount.replace(/\D/g, "") || s.accountNumber === cleanAccount
          ? {
              ...s,
              status: "ACTIVE",
              assignedBoxId: selectedBoxForDetails.id,
              assignedPort: normalizedPortLabel,
            }
          : s,
      ),
    );
    setIsAddClientModalOpen(false);
    setNewClientAccount("");
    setNewClientName("");
    setNewClientType("");
    setNewClientPlan("");
    setCustomPlanSpeed("");
    setMatchedSubscriber(null);

    // Persist to backend
    boxService
      .assignClient(selectedBoxForDetails.id, {
        port: normalizedPortLabel,
        accountNumber: cleanAccount,
        name: cleanName,
        clientType: newClientType,
        plan: effectivePlan,
      })
      .catch((err) => console.error("Error saving client:", err));
  };

  const handleCloseAddClientModal = () => {
    setIsAddClientModalOpen(false);
    setNewClientAccount("");
    setNewClientName("");
    setNewClientType("");
    setNewClientPlan("");
    setCustomPlanSpeed("");
    setMatchedSubscriber(null);
    setIsClientPortDropdownOpen(false);
    setIsClientTypeDropdownOpen(false);
    setIsClientPlanDropdownOpen(false);
    setIsSubscriberDirectoryOpen(false);
  };

  const handleToggleClientStatus = (port: string) => {
    if (!selectedBoxForDetails) return;
    const targetNum = extractPortNumber(port);
    const updatedClients = selectedBoxForDetails.clients.map((c) => {
      if (extractPortNumber(c.port) === targetNum) {
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

    // Persist to backend
    boxService
      .toggleClientStatus(selectedBoxForDetails.id, port)
      .catch((err) => console.error("Error toggling client status:", err));
  };

  const handleRemoveClient = (port: string) => {
    if (!selectedBoxForDetails) return;
    const targetNum = extractPortNumber(port);
    const removedClient = selectedBoxForDetails.clients.find(
      (c) => extractPortNumber(c.port) === targetNum,
    );
    const updatedClients = selectedBoxForDetails.clients.filter(
      (c) => extractPortNumber(c.port) !== targetNum,
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
    if (removedClient?.accountNumber) {
      const removedAccClean = String(removedClient.accountNumber).replace(
        /\D/g,
        "",
      );
      setLiveDirectory((prev) =>
        prev.map((s) =>
          String(s.accountNumber).replace(/\D/g, "") === removedAccClean ||
          s.accountNumber === removedClient.accountNumber
            ? {
                ...s,
                status: "PENDING_PROVISIONING",
                assignedBoxId: undefined,
                assignedPort: undefined,
              }
            : s,
        ),
      );
    }

    // Persist to backend
    boxService
      .removeClient(selectedBoxForDetails.id, port)
      .catch((err) => console.error("Error removing client:", err));
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

  const handleAutoDetectCoordinates = async () => {
    const site = newSiteName.trim();
    const addr = newAddress.trim();

    if (!site && !addr) {
      setGeocodingStatus("Please enter a Site Name or Street Address first");
      return;
    }

    setIsGeocoding(true);
    setGeocodingStatus("Searching Iligan landmarks & address...");

    const normalizedAddress = addr
      .replace(/\bbro\b\.?/gi, "Brother")
      .replace(/\bst\b\.?/gi, "Street")
      .replace(/\bave\b\.?/gi, "Avenue")
      .replace(/\brd\b\.?/gi, "Road");

    const searchQueries: string[] = [];
    if (site && addr) {
      searchQueries.push(
        `${site}, ${normalizedAddress}, Iligan City, Philippines`,
      );
    }
    if (site) {
      searchQueries.push(`${site}, Iligan City, Philippines`);
    }
    if (addr) {
      searchQueries.push(`${normalizedAddress}, Iligan City, Philippines`);
    }

    try {
      let matchedResult: { lat: string; lon: string; name: string } | null =
        null;

      for (const query of searchQueries) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&viewbox=124.15,8.35,124.40,8.12&bounded=0&countrycodes=ph&limit=1`;

        try {
          const response = await fetch(url, {
            headers: { Accept: "application/json" },
          });
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const found = data[0];
            matchedResult = {
              lat: Number(found.lat).toFixed(6),
              lon: Number(found.lon).toFixed(6),
              name:
                found.name ||
                (found.display_name
                  ? found.display_name.split(",")[0]
                  : query.split(",")[0]),
            };
            break;
          }
        } catch {
          // Continue to next query
        }
      }

      if (matchedResult) {
        setNewLatitude(matchedResult.lat);
        setNewLongitude(matchedResult.lon);
        setGeocodingStatus(`Auto-detected: ${matchedResult.name}`);

        // Smart proximity suggestion for Feeder Parent
        if (newCategory === "SUB_BOX") {
          const closest = getClosestMainBox(matchedResult.lat, matchedResult.lon);
          if (closest) {
            setNewParentCode(closest.code);
          }
        }
      } else {
        setGeocodingStatus(
          "⚠️ Location not found on map — please enter GPS coordinates manually",
        );
      }
    } catch (err) {
      console.warn("Geocoding lookup error:", err);
      setGeocodingStatus(
        "Lookup unavailable — please enter GPS coordinates manually",
      );
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleLatitudeChange = (val: string) => {
    // If user pastes "8.223293, 124.243392" or "8.223293 124.243392"
    if (
      val.includes(",") ||
      (val.includes(" ") && val.trim().split(/\s+/).length === 2)
    ) {
      const parts = val
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (
        parts.length >= 2 &&
        !isNaN(Number(parts[0])) &&
        !isNaN(Number(parts[1]))
      ) {
        setNewLatitude(parts[0]);
        setNewLongitude(parts[1]);
        setGeocodingStatus("Coordinates pasted and separated");

        // Smart proximity suggestion for Feeder Parent
        if (newCategory === "SUB_BOX") {
          const closest = getClosestMainBox(parts[0], parts[1]);
          if (closest) {
            setNewParentCode(closest.code);
          }
        }
        return;
      }
    }
    setNewLatitude(val);
  };

  const handleAddressChange = (text: string) => {
    setNewAddress(text);
  };

  // Find closest Main Box to the given coordinates
  const getClosestMainBox = (latStr: string, lonStr: string) => {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) return null;

    const mainBoxes = boxes.filter(
      (b) => b.category === "MAIN_BOX" && !isNaN(Number(b.latitude)) && !isNaN(Number(b.longitude))
    );
    if (mainBoxes.length === 0) return null;

    let closest = mainBoxes[0];
    let minDistance = Infinity;

    mainBoxes.forEach((b) => {
      const dLat = Number(b.latitude) - lat;
      const dLon = Number(b.longitude) - lon;
      const distSq = dLat * dLat + dLon * dLon;
      if (distSq < minDistance) {
        minDistance = distSq;
        closest = b;
      }
    });

    return closest;
  };

  const handleOpenRegisterModal = () => {
    setEditingBox(null);
    const defaultCat: "MAIN_BOX" | "SUB_BOX" = "SUB_BOX";
    setNewCategory(defaultCat);
    setNewCode(getNextBoxCode(defaultCat, boxes));

    // Default to first Main Box if available
    const mainBoxes = boxes.filter((b) => b.category === "MAIN_BOX");
    setNewParentCode(mainBoxes.length > 0 ? mainBoxes[0].code : "DB-MN-01");
    setIsParentDropdownOpen(false);

    setNewSiteName("");
    setNewAddress("");
    setNewLatitude("");
    setNewLongitude("");
    setGeocodingStatus(null);
    setIsGeocoding(false);
    setNewMountingType("Utility Pole");
    setNewPorts("");
    setIsPortsDropdownOpen(false);
    setNewSelectedEquipment([]);
    setIsEquipmentDropdownOpen(false);
    setCustomEquipmentInput("");
    setEquipmentCatalogFilter("ALL");
    setIsRegisterModalOpen(true);
  };

  const handleOpenEditBoxModal = (box: DistributionBox) => {
    setEditingBox(box);
    setNewCategory(box.category);
    setNewCode(box.code);
    const mainBoxes = boxes.filter((b) => b.category === "MAIN_BOX");
    setNewParentCode(
      box.parentCode || (mainBoxes.length > 0 ? mainBoxes[0].code : "DB-MN-01"),
    );
    setIsParentDropdownOpen(false);

    setNewSiteName(box.siteName || "");
    setNewAddress(box.address || "");
    setNewLatitude(
      box.latitude !== undefined && box.latitude !== null
        ? String(box.latitude)
        : "",
    );
    setNewLongitude(
      box.longitude !== undefined && box.longitude !== null
        ? String(box.longitude)
        : "",
    );
    setGeocodingStatus(null);
    setIsGeocoding(false);
    setNewMountingType(
      (box.mountingType as "Utility Pole" | "Wall Mount" | "Cabinet") ||
        "Utility Pole",
    );

    const existingEqNames =
      Array.isArray(box.equipment) && box.equipment.length > 0
        ? box.equipment.map((e) => e.name)
        : [];
    const hasOpticalInExisting = existingEqNames.some((eqName) => {
      const catalogItem = STANDARD_HARDWARE_CATALOG.find(
        (c) => c.name === eqName,
      );
      if (catalogItem?.category === "Optical Equipment") return true;
      return /optical|fiber|splitter/i.test(eqName);
    });
    const hydratedEq = hasOpticalInExisting
      ? existingEqNames
      : [
          box.totalPorts <= 8
            ? "FBT Optical Splitter"
            : "PLC Optical Splitter",
          ...existingEqNames,
        ];

    setNewSelectedEquipment(hydratedEq);
    setNewPorts(String(box.totalPorts || 8));
    setIsPortsDropdownOpen(false);
    setIsEquipmentDropdownOpen(false);
    setCustomEquipmentInput("");
    setEquipmentCatalogFilter("ALL");
    setIsRegisterModalOpen(true);
  };

  const isOpticalEquipmentItem = (eqName: string) => {
    const catalogItem = STANDARD_HARDWARE_CATALOG.find(
      (c) => c.name === eqName,
    );
    if (catalogItem?.category === "Optical Equipment") return true;
    return /optical|fiber|splitter/i.test(eqName);
  };

  const hasOpticalEquipmentSelected = newSelectedEquipment.some(
    isOpticalEquipmentItem,
  );

  const getDynamicPortOptions = (
    category: "MAIN_BOX" | "SUB_BOX",
    selectedEquipment: string[],
  ): { value: string; label: string }[] => {
    const isFbt = selectedEquipment.includes("FBT Optical Splitter");
    const isPlc = selectedEquipment.includes("PLC Optical Splitter");

    if (isFbt && !isPlc) {
      const ports =
        category === "SUB_BOX" ? ["2", "4", "8"] : ["2", "4", "8", "16"];
      return ports.map((p) => ({
        value: p,
        label: `${p} Ports (1:${p} FBT Split)`,
      }));
    }

    if (isPlc && !isFbt) {
      const ports =
        category === "SUB_BOX"
          ? ["8", "16", "24", "32"]
          : ["8", "16", "24", "32", "48", "64"];
      return ports.map((p) => ({
        value: p,
        label: `${p} Ports (1:${p} PLC Split)`,
      }));
    }

    const ports =
      category === "SUB_BOX"
        ? ["8", "16", "24"]
        : ["8", "16", "24", "32", "48"];
    return ports.map((p) => ({
      value: p,
      label: `${p} Ports`,
    }));
  };

  const syncPortSelectionWithEquipment = (
    updatedEquipment: string[],
    category: "MAIN_BOX" | "SUB_BOX" = newCategory,
  ) => {
    const stillHasOptical = updatedEquipment.some(isOpticalEquipmentItem);
    if (!stillHasOptical) {
      setNewPorts("");
      setIsPortsDropdownOpen(false);
      return;
    }
    if (newPorts) {
      const validValues = getDynamicPortOptions(
        category,
        updatedEquipment,
      ).map((opt) => opt.value);
      if (!validValues.includes(newPorts)) {
        setNewPorts("");
      }
    }
  };

  const handleCategoryChange = (cat: "MAIN_BOX" | "SUB_BOX") => {
    setNewCategory(cat);
    if (editingBox && editingBox.category === cat) {
      setNewCode(editingBox.code);
    } else {
      setNewCode(getNextBoxCode(cat, boxes));
    }
    setIsPortsDropdownOpen(false);
    syncPortSelectionWithEquipment(newSelectedEquipment, cat);
  };

  const handleToggleEquipment = (eqName: string) => {
    const updated = newSelectedEquipment.includes(eqName)
      ? newSelectedEquipment.filter((item) => item !== eqName)
      : [...newSelectedEquipment, eqName];
    setNewSelectedEquipment(updated);
    syncPortSelectionWithEquipment(updated);
  };

  const handleAddCustomEquipment = () => {
    const trimmed = customEquipmentInput.trim();
    if (!trimmed) return;
    if (!newSelectedEquipment.includes(trimmed)) {
      const updated = [...newSelectedEquipment, trimmed];
      setNewSelectedEquipment(updated);
      syncPortSelectionWithEquipment(updated);
    }
    setCustomEquipmentInput("");
  };

  const handleRemoveEquipment = (eqName: string) => {
    const updated = newSelectedEquipment.filter((item) => item !== eqName);
    setNewSelectedEquipment(updated);
    syncPortSelectionWithEquipment(updated);
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
      (box.latitude !== undefined && String(box.latitude).includes(query)) ||
      (box.longitude !== undefined && String(box.longitude).includes(query)) ||
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

  const handleRegisterBox = async () => {
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

    if (!hasOpticalEquipmentSelected) {
      const msg =
        "Please select optical fiber hardware under Hardware Equipment to configure Total Optical / Terminal Ports.";
      if (isWeb) {
        window.alert(msg);
      } else {
        Alert.alert("Optical Hardware Required", msg);
      }
      return;
    }

    if (!newPorts.trim()) {
      if (isWeb) {
        window.alert("Please select Total Optical / Terminal Ports.");
      } else {
        Alert.alert(
          "Required Field",
          "Please select Total Optical / Terminal Ports.",
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
              catalogId: matched?.id,
              name: eqName,
              type: matched?.type || "Equipment",
              status: "OPERATIONAL" as const,
            };
          })
        : [];

    const parsedLat = parseFloat(newLatitude);
    let parsedLng = parseFloat(newLongitude);
    if (parsedLng >= 20 && parsedLng <= 35) {
      // Auto-correct missing leading 1 for Philippine longitude (e.g. 24.2611 -> 124.2611)
      parsedLng += 100;
    }
    if (
      !newLatitude.trim() ||
      !newLongitude.trim() ||
      isNaN(parsedLat) ||
      isNaN(parsedLng)
    ) {
      const msg =
        "Please provide valid GPS Geolocation Coordinates (Latitude and Longitude) for this box. You can use Auto-Detect GPS or enter them manually.";
      if (isWeb) {
        window.alert(msg);
      } else {
        Alert.alert("GPS Coordinates Required", msg);
      }
      return;
    }

    const targetTotalPorts = parseInt(newPorts, 10) || 24;

    if (editingBox && editingBox.clients.length > 0) {
      const highestOccupiedPort = Math.max(
        0,
        ...editingBox.clients.map((c) => extractPortNumber(c.port)),
      );
      if (targetTotalPorts < highestOccupiedPort) {
        const msg = `Cannot reduce capacity to ${targetTotalPorts} ports because Port ${highestOccupiedPort} is currently occupied by a connected subscriber.`;
        if (isWeb) {
          window.alert(msg);
        } else {
          Alert.alert("Port Capacity Conflict", msg);
        }
        return;
      }
    }

    const payload = {
      code: newCode.trim().toUpperCase(),
      category: newCategory,
      parentCode: newCategory === "SUB_BOX" ? newParentCode : null,
      siteName: newSiteName.trim(),
      address: newAddress.trim(),
      mountingType: newMountingType,
      poleNumber: null,
      latitude: parsedLat,
      longitude: parsedLng,
      status: editingBox ? editingBox.status : "NEEDS_TAG",
      totalPorts: targetTotalPorts,
      notes:
        newSelectedEquipment.length > 0
          ? `Installed Hardware: ${newSelectedEquipment.join(", ")}`
          : "Standard distribution enclosure. QR tag pending physical dispatch.",
      equipment: constructedEquipment,
      clients: editingBox ? editingBox.clients : [],
    };

    if (editingBox) {
      try {
        const res = await boxService.update(editingBox.id, payload);
        if (res.success) {
          const updatedBox: DistributionBox = {
            ...editingBox,
            code: payload.code,
            category: payload.category,
            parentCode:
              payload.category === "SUB_BOX"
                ? payload.parentCode || undefined
                : undefined,
            siteName: payload.siteName,
            address: payload.address,
            mountingType: payload.mountingType,
            latitude: payload.latitude,
            longitude: payload.longitude,
            totalPorts: payload.totalPorts,
            equipment: constructedEquipment,
            notes: payload.notes,
          };

          setBoxes((prev) =>
            prev.map((b) => (b.id === editingBox.id ? updatedBox : b)),
          );
          if (selectedBoxForDetails?.id === editingBox.id) {
            setSelectedBoxForDetails(updatedBox);
          }
          setIsRegisterModalOpen(false);
          setEditingBox(null);
        } else {
          const msg = res.message || "Failed to update distribution box.";
          if (isWeb) {
            window.alert(msg);
          } else {
            Alert.alert("Error", msg);
          }
        }
      } catch (err: any) {
        const msg = err.message || "Failed to update distribution box.";
        if (isWeb) {
          window.alert(msg);
        } else {
          Alert.alert("Error", msg);
        }
      }
      return;
    }

    try {
      const res = await boxService.create(payload);
      if (res.success && res.box) {
        const savedBox: DistributionBox = {
          id: res.box.id,
          code: res.box.code,
          category: res.box.category,
          parentCode: res.box.parentCode || res.box.parent_code,
          siteName: res.box.siteName || res.box.site_name,
          address: res.box.address,
          mountingType:
            res.box.mountingType || res.box.mounting_type || "Utility Pole",
          poleNumber: res.box.poleNumber || res.box.pole_number || "",
          latitude: Number(res.box.latitude) || 8.232,
          longitude: Number(res.box.longitude) || 124.248,
          status: res.box.status || "NEEDS_TAG",
          totalPorts: res.box.totalPorts || res.box.total_ports || 24,
          activePorts: 0,
          equipment: constructedEquipment,
          clients: [],
          qrToken:
            res.box.qrToken || res.box.qr_token || `QRTECH-BOX-${res.box.code}`,
          lastScanned: "Never (New Registration)",
          notes: res.box.notes || "",
        };

        setBoxes((prev) => [savedBox, ...prev]);
        setIsRegisterModalOpen(false);

        // Reset Form
        setNewCode("");
        setNewSiteName("");
        setNewAddress("");
        setNewMountingType("Utility Pole");
        setNewPorts("");
        setIsPortsDropdownOpen(false);
        setNewSelectedEquipment([]);
        setIsEquipmentDropdownOpen(false);
        setCustomEquipmentInput("");
        setNewLatitude("");
        setNewLongitude("");
        setGeocodingStatus(null);
        setIsGeocoding(false);

        // Open QR print preview for the newly added box immediately
        setSelectedBoxForQR(savedBox);
      } else {
        const msg = res.message || "Failed to register box.";
        if (isWeb) {
          window.alert(msg);
        } else {
          Alert.alert("Error", msg);
        }
      }
    } catch (err: any) {
      const msg = err.message || "Failed to register box.";
      if (isWeb) {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    }
  };

  const totalBoxes = boxes.length;
  const mainBoxesCount = boxes.filter((b) => b.category === "MAIN_BOX").length;
  const subBoxesCount = boxes.filter((b) => b.category === "SUB_BOX").length;
  const taggedBoxesCount = boxes.filter((b) => b.status === "ACTIVE").length;
  const taggedPercentage =
    totalBoxes > 0 ? ((taggedBoxesCount / totalBoxes) * 100).toFixed(1) : "0";
  const pendingTagCount = boxes.filter((b) => b.status === "NEEDS_TAG").length;
  const issuesCount = boxes.filter((b) => b.status === "ISSUE").length;

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />
      <View className="flex-1 flex-row h-full">
        {/* Responsive Collapsible Sidebar */}
        {isWeb && (
          <SidebarNavigation
            activeRoute="/admin/box-management"
            collapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            className="hidden md:flex"
            badgeCounts={{
              boxes: boxes.length > 0 ? boxes.length : undefined,
              newQr:
                boxes.filter((b) => b.status === "NEEDS_TAG").length > 0
                  ? `${boxes.filter((b) => b.status === "NEEDS_TAG").length} New`
                  : undefined,
              logs:
                boxes.filter((b) => b.status === "ISSUE").length > 0
                  ? String(boxes.filter((b) => b.status === "ISSUE").length)
                  : undefined,
            }}
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
                  onPress={fetchBoxes}
                  disabled={loading}
                  className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-2xl flex-row items-center shadow-sm mr-2"
                  activeOpacity={0.8}
                  accessibilityLabel="Refresh Box Data"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#475569" />
                  ) : (
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color="#475569"
                    />
                  )}
                </TouchableOpacity>

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
                      {totalBoxes}
                    </Text>
                    <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-poppins-bold text-[#475569]">
                        {mainBoxesCount} Main · {subBoxesCount} Sub
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Active Enclosures in Network
                  </Text>
                </View>
              </View>

              {/* Card 2: Tagged Boxes */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-5 rounded-3xl border-2 border-emerald-500/30 shadow-sm justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Tagged Boxes
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-200">
                      <MaterialCommunityIcons
                        name="tag-check-outline"
                        size={16}
                        color="#059669"
                      />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {taggedBoxesCount}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Text className="text-[10px] font-poppins-bold text-emerald-700">
                        {taggedPercentage}% Verified
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    {taggedBoxesCount} of {totalBoxes} physically tagged
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
                      {pendingTagCount}
                    </Text>
                    <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Text className="text-[10px] font-poppins-bold text-amber-700">
                        Needs Dispatch
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    Awaiting physical QR label
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
                      {issuesCount}
                    </Text>
                    <View className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <Text className="text-[10px] font-poppins-bold text-rose-700">
                        Hardware Alarms
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]">
                    {issuesCount > 0
                      ? `${issuesCount} enclosures need inspection`
                      : "All systems operational"}
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
                  { id: "MAIN_BOX", label: `Main (${mainBoxesCount})` },
                  { id: "SUB_BOX", label: `Sub (${subBoxesCount})` },
                  {
                    id: "ACTIVE",
                    label: `Active (${boxes.filter((b) => b.status === "ACTIVE").length})`,
                  },
                  { id: "NEEDS_TAG", label: `Needs Tag (${pendingTagCount})` },
                  { id: "ISSUE", label: `Issues (${issuesCount})` },
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
                        Box Code
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
                        Latitude & Longitude
                      </Text>
                    </View>
                    <View className="w-[145px] min-w-[145px] text-right">
                      <Text className="text-[11px] font-poppins-bold text-[#64748b] uppercase tracking-wider text-right">
                        Actions
                      </Text>
                    </View>
                  </View>

                  {/* Table Body Rows (Paginated) */}
                  {loading ? (
                    <View className="py-16 items-center justify-center">
                      <ActivityIndicator size="large" color="#4d6029" />
                      <Text className="text-xs font-poppins-medium text-[#64748b] mt-3">
                        Loading distribution enclosures...
                      </Text>
                    </View>
                  ) : paginatedBoxes.length === 0 ? (
                    <View className="py-16 items-center justify-center px-4">
                      <View className="w-12 h-12 rounded-2xl bg-slate-100 items-center justify-center mb-3">
                        <MaterialCommunityIcons
                          name="server-off"
                          size={24}
                          color="#94a3b8"
                        />
                      </View>
                      <Text className="text-sm font-poppins-bold text-[#0f172a]">
                        No distribution boxes found
                      </Text>
                      <Text className="text-xs font-poppins text-[#64748b] text-center mt-1 max-w-sm">
                        {searchQuery
                          ? `No boxes match "${searchQuery}". Try clearing your search or filter.`
                          : "No enclosures registered yet. Click '+ Register New Box' above to register your first enclosure."}
                      </Text>
                    </View>
                  ) : (
                    paginatedBoxes.map((box, index) => {
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

                          {/* 6. Latitude & Longitude */}
                          <View className="flex-[2.1] min-w-[200px] px-2 items-center justify-center">
                            <View className="flex-row items-center">
                              <Ionicons
                                name="navigate-outline"
                                size={12}
                                color="#4d6029"
                              />
                              <Text
                                className="text-xs font-mono font-poppins-bold text-[#0f172a] ml-1 text-center"
                                numberOfLines={1}
                              >
                                {box.latitude !== undefined &&
                                box.latitude !== null
                                  ? Number(box.latitude).toFixed(6)
                                  : "0.000000"}
                                ,{" "}
                                {box.longitude !== undefined &&
                                box.longitude !== null
                                  ? Number(box.longitude).toFixed(6)
                                  : "0.000000"}
                              </Text>
                            </View>
                            <Text
                              className="text-[10px] font-poppins text-[#64748b] mt-0.5 text-center"
                              numberOfLines={1}
                            >
                              {box.latitude !== undefined &&
                              box.latitude !== null
                                ? `${Number(box.latitude).toFixed(4)}° N`
                                : ""}
                              ,{" "}
                              {box.longitude !== undefined &&
                              box.longitude !== null
                                ? `${Number(box.longitude).toFixed(4)}° E`
                                : ""}
                            </Text>
                          </View>

                          {/* 7. Actions */}
                          <View className="w-[145px] min-w-[145px] flex-row items-center justify-end gap-1.5">
                            <TouchableOpacity
                              onPress={() => setSelectedBoxForQR(box)}
                              className="w-7 h-7 rounded-lg bg-[#4d6029]/10 hover:bg-[#4d6029]/20 border border-[#4d6029]/30 items-center justify-center"
                              accessibilityLabel="Print QR"
                            >
                              <MaterialCommunityIcons
                                name="qrcode-scan"
                                size={13}
                                color="#4d6029"
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleOpenEditBoxModal(box)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 items-center justify-center"
                              accessibilityLabel={`Edit ${box.code}`}
                            >
                              <Ionicons
                                name="create-outline"
                                size={14}
                                color="#334155"
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

      {/* MODAL 1: DETAILED BOX INSPECTOR & PORT DIRECTORY */}
      {selectedBoxForDetails && (
        <Modal
          visible={!!selectedBoxForDetails}
          transparent
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => {
            setSelectedBoxForDetails(null);
            setModalClientSearch("");
          }}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-100 overflow-hidden flex-col">
              {/* 1. Inspector Header Overview (Classification, Status, Location, Topology) */}
              <View className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                {/* Top Row: Badges & Close Button */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-wrap gap-2">
                    {/* Box Code */}
                    <View className="bg-[#0f172a] px-3 py-1 rounded-xl flex-row items-center shadow-xs">
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
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs active:bg-slate-100"
                  >
                    <Ionicons name="close" size={17} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Site Name */}
                <Text className="text-base sm:text-lg font-poppins-bold text-[#0f172a]">
                  {selectedBoxForDetails.siteName}
                </Text>

                {/* Location Bar */}
                <View className="flex-row items-center mt-1">
                  <Ionicons name="location" size={13} color="#4d6029" />
                  <Text
                    className="text-xs font-poppins-medium text-[#64748b] ml-1 flex-1"
                    numberOfLines={1}
                  >
                    {selectedBoxForDetails.address}
                  </Text>
                </View>
              </View>

              {/* 2. Tab Switcher (flexGrow: 0 prevents vertical expansion) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="border-b border-slate-100 bg-white shrink-0"
                style={{ flexGrow: 0 }}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("CLIENTS")}
                  className={`pb-2.5 mr-4 sm:mr-5 flex-row items-center border-b-2 ${
                    activeDetailsTab === "CLIENTS"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <Ionicons
                    name="people"
                    size={14}
                    color={
                      activeDetailsTab === "CLIENTS" ? "#4d6029" : "#64748b"
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
                  className={`pb-2.5 mr-4 sm:mr-5 flex-row items-center border-b-2 ${
                    activeDetailsTab === "EQUIPMENT"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="tools"
                    size={14}
                    color={
                      activeDetailsTab === "EQUIPMENT" ? "#4d6029" : "#64748b"
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
                  onPress={() => setActiveDetailsTab("LOCATION")}
                  className={`pb-2.5 mr-4 sm:mr-5 flex-row items-center border-b-2 ${
                    activeDetailsTab === "LOCATION"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <Ionicons
                    name="location"
                    size={14}
                    color={
                      activeDetailsTab === "LOCATION" ? "#4d6029" : "#64748b"
                    }
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      activeDetailsTab === "LOCATION"
                        ? "text-[#4d6029]"
                        : "text-[#64748b]"
                    }`}
                  >
                    Location & Specs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveDetailsTab("SCAN_LOGS")}
                  className={`pb-2.5 pr-2 flex-row items-center border-b-2 ${
                    activeDetailsTab === "SCAN_LOGS"
                      ? "border-[#4d6029]"
                      : "border-transparent"
                  }`}
                >
                  <Ionicons
                    name="scan"
                    size={14}
                    color={
                      activeDetailsTab === "SCAN_LOGS" ? "#4d6029" : "#64748b"
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
              </ScrollView>

              {/* 3. Tab Content Body */}
              <ScrollView
                className="p-5 sm:p-6 flex-1"
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {activeDetailsTab === "CLIENTS" && (
                  <View>
                    {/* Capacity Summary & In-Modal Client Search Bar */}
                    <View className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View>
                          <Text className="text-xs font-poppins-bold text-[#0f172a]">
                            Port Allocation: {selectedBoxForDetails.activePorts}{" "}
                            of {selectedBoxForDetails.totalPorts} Ports Active
                          </Text>
                          <Text className="text-[11px] font-poppins text-[#64748b] mt-0.5">
                            {selectedBoxForDetails.totalPorts -
                              selectedBoxForDetails.activePorts}{" "}
                            Ports Available for Drops
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleOpenAddClientModal()}
                          className="bg-[#4d6029] px-3.5 py-2 rounded-xl flex-row items-center shadow-xs"
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="person-add"
                            size={13}
                            color="#ffffff"
                          />
                          <Text className="text-xs font-poppins-bold text-white ml-1.5">
                            Connect Subscriber
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

                      {/* Interactive Port Allocation Matrix (P1..PN) */}
                      <View className="mb-3">
                        <View className="flex-row items-center justify-between mb-2 px-0.5">
                          <View className="flex-row items-center">
                            <View className="w-2.5 h-2.5 rounded-full bg-[#4d6029] mr-1.5" />
                            <Text className="text-[10px] font-poppins-medium text-[#475569]">
                              Occupied
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <View className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 mr-1.5" />
                            <Text className="text-[10px] font-poppins-medium text-[#475569]">
                              Available
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row flex-wrap -mx-1">
                          {Array.from(
                            { length: selectedBoxForDetails.totalPorts },
                            (_, idx) => idx + 1,
                          ).map((portNum) => {
                            const portLabel = formatPortLabel(portNum);
                            const clientOnPort =
                              selectedBoxForDetails.clients.find(
                                (c) => extractPortNumber(c.port) === portNum,
                              );
                            const isOccupied = Boolean(clientOnPort);
                            const isSuspended =
                              clientOnPort?.status === "DISCONNECTED";
                            const isFilteredToThisPort =
                              modalClientSearch.toLowerCase().trim() !== "" &&
                              modalClientSearch
                                .toLowerCase()
                                .trim()
                                .startsWith("port") &&
                              extractPortNumber(modalClientSearch) === portNum;
                            const widthClass =
                              selectedBoxForDetails.totalPorts <= 8
                                ? "w-1/4"
                                : "w-1/4 sm:w-1/8";

                            return (
                              <View
                                key={portNum}
                                className={`${widthClass} px-1 mb-2`}
                              >
                                <TouchableOpacity
                                  onPress={() => {
                                    if (isOccupied) {
                                      setModalClientSearch(
                                        isFilteredToThisPort ? "" : portLabel,
                                      );
                                    } else {
                                      handleOpenAddClientModal(portLabel);
                                    }
                                  }}
                                  activeOpacity={0.75}
                                  className={`h-11 rounded-xl items-center justify-center border ${
                                    isOccupied
                                      ? isSuspended
                                        ? "bg-amber-600 border-amber-700"
                                        : isFilteredToThisPort
                                          ? "bg-[#2d3818] border-[#1e2610]"
                                          : "bg-[#4d6029] border-[#3e4e20]"
                                      : "bg-white border-slate-200 hover:border-[#4d6029]"
                                  }`}
                                >
                                  <Text
                                    className={`text-xs font-poppins-bold ${
                                      isOccupied
                                        ? "text-white"
                                        : "text-[#0f172a]"
                                    }`}
                                  >
                                    P{portNum}
                                  </Text>
                                  <Text
                                    className={`text-[8px] font-poppins ${
                                      isOccupied
                                        ? "text-white/85"
                                        : "text-emerald-700"
                                    }`}
                                    numberOfLines={1}
                                  >
                                    {isOccupied
                                      ? isFilteredToThisPort
                                        ? "Filtered"
                                        : "Occupied"
                                      : "+ Assign"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* In-Modal Search Input */}
                      <View className="flex-row items-center bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-xs">
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
                              size={15}
                              color="#94a3b8"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Filtered Clients List */}
                    {(() => {
                      const query = modalClientSearch.toLowerCase().trim();
                      const queryPortNum = query.startsWith("port")
                        ? extractPortNumber(query)
                        : 0;
                      const filteredClients =
                        selectedBoxForDetails.clients.filter((c) => {
                          if (query === "") return true;
                          if (
                            queryPortNum > 0 &&
                            extractPortNumber(c.port) === queryPortNum
                          ) {
                            return true;
                          }
                          return (
                            c.name.toLowerCase().includes(query) ||
                            c.accountNumber.toLowerCase().includes(query) ||
                            c.port.toLowerCase().includes(query)
                          );
                        });

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
                              onPress={() => handleOpenAddClientModal()}
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
                                    <View className="flex-row items-center flex-wrap">
                                      <Text
                                        className="text-xs font-poppins-bold text-[#0f172a] mr-1.5"
                                        numberOfLines={1}
                                      >
                                        {client.name}
                                      </Text>
                                      {client.clientType && (
                                        <View
                                          className={`px-1.5 py-0.2 rounded border ${
                                            client.clientType
                                              .toUpperCase()
                                              .includes("COMMERCIAL")
                                              ? "bg-blue-50 border-blue-200"
                                              : "bg-emerald-50 border-emerald-200"
                                          }`}
                                        >
                                          <Text
                                            className={`text-[9px] font-poppins-bold ${
                                              client.clientType
                                                .toUpperCase()
                                                .includes("COMMERCIAL")
                                                ? "text-blue-700"
                                                : "text-emerald-700"
                                            }`}
                                          >
                                            {client.clientType
                                              .toUpperCase()
                                              .includes("COMMERCIAL")
                                              ? "Commercial"
                                              : "Residential"}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                    <View className="flex-row items-center mt-0.5">
                                      <Text
                                        className="text-[11px] font-mono font-poppins-semibold text-[#64748b]"
                                        numberOfLines={1}
                                      >
                                        {client.accountNumber}
                                      </Text>
                                      {client.plan && (
                                        <Text
                                          className="text-[10px] font-poppins text-[#94a3b8] ml-1.5"
                                          numberOfLines={1}
                                        >
                                          · {client.plan}
                                        </Text>
                                      )}
                                    </View>
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
                              Type: {eq.type}
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

                {activeDetailsTab === "LOCATION" && (
                  <View className="space-y-3">
                    {/* Mounting Type Card */}
                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 mb-3 flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 mr-3">
                        <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center mr-3">
                          <Ionicons name="cube" size={18} color="#2563eb" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                            Mounting Architecture
                          </Text>
                          <Text className="text-sm font-poppins-bold text-[#0f172a]">
                            {selectedBoxForDetails.mountingType ||
                              "Utility Pole"}
                          </Text>
                        </View>
                      </View>
                      <View className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                        <Text className="text-[10px] font-poppins-bold text-blue-700">
                          Structure
                        </Text>
                      </View>
                    </View>

                    {/* GPS Coordinates Card */}
                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                            <Ionicons
                              name="navigate"
                              size={18}
                              color="#059669"
                            />
                          </View>
                          <View>
                            <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                              GPS Coordinates (Geographic Locus)
                            </Text>
                            <Text className="text-sm font-poppins-bold text-[#0f172a]">
                              {selectedBoxForDetails.latitude.toFixed(6)}° N,{" "}
                              {selectedBoxForDetails.longitude.toFixed(6)}° E
                            </Text>
                          </View>
                        </View>
                        <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Text className="text-[10px] font-poppins-bold text-emerald-700">
                            Verified GPS
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row gap-2 mt-2 pt-2 border-t border-slate-200/60">
                        <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200">
                          <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                            Latitude
                          </Text>
                          <Text className="text-xs font-mono font-poppins-bold text-[#0f172a]">
                            {selectedBoxForDetails.latitude.toFixed(7)}
                          </Text>
                        </View>
                        <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200">
                          <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                            Longitude
                          </Text>
                          <Text className="text-xs font-mono font-poppins-bold text-[#0f172a]">
                            {selectedBoxForDetails.longitude.toFixed(7)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {activeDetailsTab === "SCAN_LOGS" && (
                  <View className="space-y-3">
                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <View className="w-9 h-9 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                            <Ionicons
                              name="qr-code"
                              size={18}
                              color="#4d6029"
                            />
                          </View>
                          <View>
                            <Text className="text-xs font-poppins-bold text-[#0f172a]">
                              Physical Token & QR Identifier
                            </Text>
                            <Text className="text-[10px] font-poppins text-[#64748b]">
                              Unique encoded cryptographic identifier
                            </Text>
                          </View>
                        </View>
                        <View className="bg-[#4d6029]/10 border border-[#4d6029]/20 px-2 py-0.5 rounded-lg">
                          <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                            NFC / QR
                          </Text>
                        </View>
                      </View>

                      <View className="bg-white p-3 rounded-xl border border-slate-200 mt-1">
                        <Text className="text-xs font-mono font-poppins-semibold text-[#4d6029] select-all">
                          {selectedBoxForDetails.qrToken}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* 4. Inspector Footer Actions */}
              <View className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex-row items-center justify-between shrink-0">
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBoxForDetails(null);
                    router.push("/admin/dashboard");
                  }}
                  className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl flex-row items-center shadow-xs active:bg-slate-50"
                >
                  <Ionicons name="map-outline" size={15} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    View on Map
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSelectedBoxForDetails(null);
                    setModalClientSearch("");
                  }}
                  className="px-6 py-2.5 bg-slate-200 rounded-xl active:bg-slate-300"
                >
                  <Text className="text-xs font-poppins-bold text-[#475569]">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: REGISTER / EDIT DISTRIBUTION BOX */}
      {isRegisterModalOpen && (
        <Modal
          visible={isRegisterModalOpen}
          transparent
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => {
            setIsRegisterModalOpen(false);
            setEditingBox(null);
          }}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6">
              <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                    <Ionicons
                      name={editingBox ? "create-outline" : "add-circle"}
                      size={18}
                      color="#4d6029"
                    />
                  </View>
                  <Text className="text-base font-poppins-bold text-[#0f172a]">
                    {editingBox
                      ? `Edit Distribution Box (${editingBox.code})`
                      : "Register New Distribution Box"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setIsRegisterModalOpen(false);
                    setEditingBox(null);
                  }}
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
                    Box Classification:
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
                <View
                  className="flex-row gap-2.5"
                  style={{
                    zIndex: isParentDropdownOpen ? 100 : 1,
                  }}
                >
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
                      <View
                        className="relative"
                        style={{
                          zIndex: isParentDropdownOpen ? 100 : 1,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex-row items-center justify-between"
                          activeOpacity={0.8}
                        >
                          <Text
                            className={`text-xs ${
                              newParentCode
                                ? "font-poppins-bold text-[#0f172a]"
                                : "font-poppins-medium text-[#94a3b8]"
                            }`}
                            numberOfLines={1}
                          >
                            {newParentCode || "Select Feeder Main Box"}
                          </Text>
                          <Ionicons
                            name={isParentDropdownOpen ? "chevron-up" : "chevron-down"}
                            size={14}
                            color="#64748b"
                          />
                        </TouchableOpacity>

                        {/* Floating Absolute Overlay Dropdown Menu */}
                        {isParentDropdownOpen && (
                          <View
                            className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              marginTop: 6,
                              zIndex: 9999,
                              elevation: 50,
                              shadowColor: "#0f172a",
                              shadowOffset: { width: 0, height: 10 },
                              shadowOpacity: 0.25,
                              shadowRadius: 20,
                            }}
                          >
                          {boxes.filter((b) => b.category === "MAIN_BOX").length === 0 ? (
                            <View className="p-3">
                              <Text className="text-xs font-poppins text-[#94a3b8] text-center">
                                No Main Distribution Boxes registered yet.
                              </Text>
                            </View>
                          ) : (
                            boxes
                              .filter((b) => b.category === "MAIN_BOX")
                              .map((mb) => {
                                const isSelected = newParentCode === mb.code;
                                return (
                                  <TouchableOpacity
                                    key={mb.id}
                                    onPress={() => {
                                      setNewParentCode(mb.code);
                                      setIsParentDropdownOpen(false);
                                    }}
                                    className="px-3 py-2.5 flex-row items-center border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                                  >
                                    {/* Left Checkbox */}
                                    <View
                                      className={`w-4 h-4 rounded border mr-2.5 items-center justify-center ${
                                        isSelected
                                          ? "bg-[#4d6029] border-[#4d6029]"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isSelected && (
                                        <Ionicons
                                          name="checkmark"
                                          size={11}
                                          color="#ffffff"
                                        />
                                      )}
                                    </View>

                                    <View className="flex-1">
                                      <View className="flex-row items-center">
                                        <Text className="text-xs font-poppins-bold text-[#0f172a]">
                                          {mb.code}
                                        </Text>
                                        <View className="ml-1.5 px-1.5 py-0.5 rounded-md bg-[#4d6029]/10 border border-[#4d6029]/30">
                                          <Text className="text-[8px] font-poppins-bold text-[#4d6029]">
                                            MAIN
                                          </Text>
                                        </View>
                                      </View>
                                      <Text
                                        className="text-[10px] font-poppins text-[#64748b] mt-0.5"
                                        numberOfLines={1}
                                      >
                                        {mb.siteName || mb.address || "Main Feeder Node"}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })
                          )}
                        </View>
                      )}
                    </View>
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
                    onChangeText={handleAddressChange}
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

                {/* GPS Field Geolocation Coordinates */}
                <View className="mt-3 bg-slate-50 border border-slate-200/90 rounded-2xl p-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="navigate-outline"
                        size={15}
                        color="#4d6029"
                      />
                      <Text className="text-xs font-poppins-semibold text-[#334155] ml-1.5">
                        GPS Geolocation Coordinates:
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={handleAutoDetectCoordinates}
                        disabled={isGeocoding}
                        className="bg-[#4d6029]/10 hover:bg-[#4d6029]/20 border border-[#4d6029]/30 px-2.5 py-1 rounded-lg flex-row items-center mr-2"
                        activeOpacity={0.7}
                        accessibilityLabel="Auto-detect GPS coordinates from site name and street address"
                      >
                        {isGeocoding ? (
                          <ActivityIndicator
                            size="small"
                            color="#4d6029"
                            style={{ transform: [{ scale: 0.7 }] }}
                          />
                        ) : (
                          <Ionicons name="search" size={11} color="#4d6029" />
                        )}
                        <Text className="text-[10px] font-poppins-bold text-[#4d6029] ml-1">
                          {isGeocoding ? "Detecting..." : "Auto-Detect GPS"}
                        </Text>
                      </TouchableOpacity>
                      <Text className="text-[10px] font-poppins text-slate-500">
                        WGS84
                      </Text>
                    </View>
                  </View>

                  {geocodingStatus && (
                    <View className="flex-row items-center mb-2 px-1">
                      <Ionicons
                        name={
                          geocodingStatus.startsWith("Auto-detected") ||
                          geocodingStatus.startsWith("Coordinates pasted")
                            ? "checkmark-circle"
                            : "information-circle-outline"
                        }
                        size={12}
                        color={
                          geocodingStatus.startsWith("Auto-detected") ||
                          geocodingStatus.startsWith("Coordinates pasted")
                            ? "#16a34a"
                            : geocodingStatus.includes("⚠️")
                              ? "#d97706"
                              : "#64748b"
                        }
                      />
                      <Text
                        className={`text-[10px] font-poppins ml-1 ${
                          geocodingStatus.startsWith("Auto-detected") ||
                          geocodingStatus.startsWith("Coordinates pasted")
                            ? "text-emerald-700 font-poppins-medium"
                            : geocodingStatus.includes("⚠️")
                              ? "text-amber-700 font-poppins-medium"
                              : "text-[#64748b]"
                        }`}
                        numberOfLines={1}
                      >
                        {geocodingStatus}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="text-[10px] font-poppins-medium text-[#64748b] mb-1">
                        Latitude (°N):
                      </Text>
                      <TextInput
                        placeholder="e.g. 8.225210"
                        placeholderTextColor="#94a3b8"
                        value={newLatitude}
                        onChangeText={handleLatitudeChange}
                        keyboardType="numeric"
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-poppins-medium text-[#0f172a]"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-poppins-medium text-[#64748b] mb-1">
                        Longitude (°E):
                      </Text>
                      <TextInput
                        placeholder="e.g. 124.239519"
                        placeholderTextColor="#94a3b8"
                        value={newLongitude}
                        onChangeText={setNewLongitude}
                        keyboardType="numeric"
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-poppins-medium text-[#0f172a]"
                      />
                    </View>
                  </View>
                </View>

                {/* Hardware Equipment Multi-Select Dropdown Section */}
                <View className="mt-3">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-poppins-semibold text-[#475569]">
                      Hardware Equipment:
                    </Text>
                    {newSelectedEquipment.length > 0 && (
                      <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-poppins-bold text-[#2d3416]">
                          {newSelectedEquipment.length} item
                          {newSelectedEquipment.length === 1 ? "" : "s"}{" "}
                          assigned
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* Dropdown Toggle Trigger Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setIsEquipmentDropdownOpen(!isEquipmentDropdownOpen);
                      if (!isEquipmentDropdownOpen) setIsPortsDropdownOpen(false);
                    }}
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

                      {/* Equipment Item Checklist (Includes PLC & FBT Optical Splitters) */}
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
                              className="flex-row items-center justify-between p-2.5 rounded-xl border border-slate-200/80 mb-2 bg-white hover:bg-slate-50 transition-colors"
                              activeOpacity={0.7}
                            >
                              <View className="flex-row items-center flex-1 mr-2">
                                {/* Left Checkbox */}
                                <View
                                  className={`w-4 h-4 rounded border mr-2.5 items-center justify-center ${
                                    isSelected
                                      ? "bg-[#4d6029] border-[#4d6029]"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && (
                                    <Ionicons
                                      name="checkmark"
                                      size={11}
                                      color="#ffffff"
                                    />
                                  )}
                                </View>
                                <Text
                                  className={`text-xs ${
                                    isSelected
                                      ? "font-poppins-bold text-[#0f172a]"
                                      : "font-poppins-medium text-[#1e293b]"
                                  }`}
                                >
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
                      <View className="py-3.5 px-4 bg-[#f8fafc] border border-dashed border-slate-300 rounded-2xl items-center justify-center">
                        <Text className="text-xs font-poppins text-[#94a3b8] text-center">
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

                {/* Port Capacity Dropdown (Appears when Optical Equipment is selected) */}
                {hasOpticalEquipmentSelected && (
                  <View
                    className="mt-3"
                    style={{
                      zIndex: isPortsDropdownOpen ? 80 : 2,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text className="text-xs font-poppins-semibold text-[#475569]">
                        Total Optical / Terminal Ports:
                      </Text>
                      <View className="bg-[#4d6029]/10 border border-[#4d6029]/30 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                          {newSelectedEquipment.includes("FBT Optical Splitter") &&
                          !newSelectedEquipment.includes("PLC Optical Splitter")
                            ? "FBT Optical Splitter"
                            : newSelectedEquipment.includes("PLC Optical Splitter") &&
                                !newSelectedEquipment.includes("FBT Optical Splitter")
                              ? "PLC Optical Splitter"
                              : "Optical Fiber Active"}
                        </Text>
                      </View>
                    </View>

                    <View className="relative" style={{ zIndex: 80 }}>
                      {/* Dropdown Toggle Trigger Button */}
                      <TouchableOpacity
                        onPress={() => {
                          setIsPortsDropdownOpen(!isPortsDropdownOpen);
                          if (!isPortsDropdownOpen)
                            setIsEquipmentDropdownOpen(false);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between"
                        activeOpacity={0.8}
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <MaterialCommunityIcons
                            name="server-network"
                            size={16}
                            color="#4d6029"
                          />
                          <Text
                            className={`text-xs ml-2 ${
                              newPorts
                                ? "font-poppins-semibold text-[#0f172a]"
                                : "font-poppins-medium text-[#0f172a]"
                            }`}
                          >
                            {newPorts
                              ? getDynamicPortOptions(
                                  newCategory,
                                  newSelectedEquipment,
                                ).find((opt) => opt.value === newPorts)?.label ||
                                `${newPorts} Ports`
                              : "+ Add or Select Port"}
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            isPortsDropdownOpen ? "chevron-up" : "chevron-down"
                          }
                          size={16}
                          color="#64748b"
                        />
                      </TouchableOpacity>

                      {/* Dropdown Options Panel */}
                      {isPortsDropdownOpen && (
                        <View className="mt-1.5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                          {getDynamicPortOptions(
                            newCategory,
                            newSelectedEquipment,
                          ).map((opt, idx, arr) => {
                            const isSelected = newPorts === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                onPress={() => {
                                  setNewPorts(opt.value);
                                  setIsPortsDropdownOpen(false);
                                }}
                                className={`flex-row items-center justify-between px-3.5 py-2.5 ${
                                  idx < arr.length - 1
                                    ? "border-b border-slate-100"
                                    : ""
                                } bg-white hover:bg-slate-50`}
                                activeOpacity={0.7}
                              >
                                <View className="flex-row items-center flex-1 mr-2">
                                  {/* Left Checkbox */}
                                  <View
                                    className={`w-4 h-4 rounded border mr-2.5 items-center justify-center ${
                                      isSelected
                                        ? "bg-[#4d6029] border-[#4d6029]"
                                        : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {isSelected && (
                                      <Ionicons
                                        name="checkmark"
                                        size={11}
                                        color="#ffffff"
                                      />
                                    )}
                                  </View>
                                  <Text
                                    className={`text-xs ${
                                      isSelected
                                        ? "font-poppins-bold text-[#0f172a]"
                                        : "font-poppins-medium text-[#1e293b]"
                                    }`}
                                  >
                                    {opt.label}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                )}
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
                    {editingBox ? "Save Changes" : "Save Box & Generate QR"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsRegisterModalOpen(false);
                    setEditingBox(null);
                  }}
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
          statusBarTranslucent={true}
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

                {/* Real Scannable QR Code */}
                <View className="w-36 h-36 bg-[#f8fafc] border border-slate-200 rounded-2xl items-center justify-center p-2 mb-3 shadow-inner">
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
                        selectedBoxForQR.qrToken || selectedBoxForQR.code,
                      )}`,
                    }}
                    className="w-32 h-32"
                    resizeMode="contain"
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
                  onPress={async () => {
                    const currentBox = selectedBoxForQR;
                    if (isWeb) {
                      window.alert(
                        `Printing 50x50mm QR thermal label for ${currentBox.code}`,
                      );
                    } else {
                      Alert.alert(
                        "Print Thermal Label",
                        `Sending 50x50mm label for ${currentBox.code} to thermal printer.`,
                      );
                    }
                    setSelectedBoxForQR(null);
                    // Asynchronously log dispatch to PostgreSQL qr_dispatches table
                    try {
                      await boxService.recordDispatch(
                        currentBox.id,
                        "50x50mm Door Placard",
                      );
                    } catch (err) {
                      console.warn("Failed to record qr_dispatch:", err);
                    }
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
          statusBarTranslucent={true}
          onRequestClose={handleCloseAddClientModal}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View
              style={{ overflow: "visible" }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh]"
            >
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
                  onPress={handleCloseAddClientModal}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView
                className="py-4 space-y-4"
                style={{ zIndex: 50, overflow: "visible" }}
                contentContainerStyle={{
                  paddingBottom: isClientPlanDropdownOpen ? 140 : 16,
                }}
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
                <View
                  className="mb-3.5 relative"
                  style={{ zIndex: isClientPortDropdownOpen ? 100 : 40 }}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Assign Optical Port *
                    </Text>
                    <Text className="text-[10px] font-poppins-semibold text-[#64748b]">
                      {selectedBoxForDetails.totalPorts -
                        getAvailablePorts(selectedBoxForDetails).length}{" "}
                      Occupied ·{" "}
                      {getAvailablePorts(selectedBoxForDetails).length} Free
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsClientPortDropdownOpen(!isClientPortDropdownOpen);
                      setIsSubscriberDirectoryOpen(false);
                      setIsClientTypeDropdownOpen(false);
                      setIsClientPlanDropdownOpen(false);
                    }}
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
                      {newClientPort && (
                        <View className="ml-2 bg-[#4d6029]/10 border border-[#4d6029]/30 px-2 py-0.5 rounded-md">
                          <Text className="text-[9px] font-poppins-bold text-[#4d6029]">
                            Available
                          </Text>
                        </View>
                      )}
                    </View>
                    <Ionicons
                      name={
                        isClientPortDropdownOpen ? "chevron-up" : "chevron-down"
                      }
                      size={16}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  {/* Visual Optical Port Allocation Grid Selector */}
                  {isClientPortDropdownOpen && (
                    <View
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 6,
                        zIndex: 100,
                      }}
                      className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xl"
                    >
                      <View className="flex-row items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                        <Text className="text-[11px] font-poppins-bold text-[#0f172a]">
                          Optical Port Allocation (1–
                          {selectedBoxForDetails.totalPorts})
                        </Text>
                        <View className="flex-row items-center gap-3">
                          <View className="flex-row items-center">
                            <View className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300 mr-1" />
                            <Text className="text-[10px] font-poppins text-[#64748b]">
                              Available
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <View className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-300 mr-1" />
                            <Text className="text-[10px] font-poppins text-[#64748b]">
                              Occupied (Locked)
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ScrollView
                        className="max-h-52"
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        <View className="flex-row flex-wrap -mx-1 pb-1">
                          {Array.from(
                            { length: selectedBoxForDetails.totalPorts },
                            (_, idx) => idx + 1,
                          ).map((portNum) => {
                            const portLabel = formatPortLabel(portNum);
                            const occupant =
                              selectedBoxForDetails.clients.find(
                                (c) => extractPortNumber(c.port) === portNum,
                              ) || null;
                            const isOccupied = Boolean(occupant);
                            const isSelected =
                              !isOccupied &&
                              extractPortNumber(newClientPort) === portNum;

                            return (
                              <View key={portLabel} className="w-1/3 px-1 mb-2">
                                <TouchableOpacity
                                  disabled={isOccupied}
                                  onPress={() => {
                                    setNewClientPort(portLabel);
                                    setIsClientPortDropdownOpen(false);
                                  }}
                                  activeOpacity={0.75}
                                  className={`p-2 rounded-xl border ${
                                    isOccupied
                                      ? "bg-slate-100 border-slate-200 opacity-70"
                                      : isSelected
                                        ? "bg-[#4d6029] border-[#4d6029]"
                                        : "bg-white border-slate-200"
                                  }`}
                                >
                                  <View className="flex-row items-center justify-between">
                                    <Text
                                      className={`text-xs font-poppins-bold ${
                                        isOccupied
                                          ? "text-slate-500"
                                          : isSelected
                                            ? "text-white"
                                            : "text-[#0f172a]"
                                      }`}
                                    >
                                      {portLabel}
                                    </Text>
                                    <Ionicons
                                      name={
                                        isOccupied
                                          ? "lock-closed"
                                          : isSelected
                                            ? "checkmark-circle"
                                            : "ellipse-outline"
                                      }
                                      size={12}
                                      color={
                                        isOccupied
                                          ? "#94a3b8"
                                          : isSelected
                                            ? "#ffffff"
                                            : "#cbd5e1"
                                      }
                                    />
                                  </View>
                                  <Text
                                    className={`text-[9px] font-poppins mt-0.5 ${
                                      isOccupied
                                        ? "text-slate-500"
                                        : isSelected
                                          ? "text-white/90"
                                          : "text-emerald-700"
                                    }`}
                                    numberOfLines={1}
                                  >
                                    {isOccupied
                                      ? occupant?.name || "Occupied"
                                      : "Available"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 2. Account Number Input with Auto-Detection & Directory Picker */}
                <View
                  className="mb-3.5 relative"
                  style={{ zIndex: isSubscriberDirectoryOpen ? 100 : 30 }}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Subscriber Account Number (10 Digits) *
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setIsSubscriberDirectoryOpen(
                          !isSubscriberDirectoryOpen,
                        );
                        setIsClientPortDropdownOpen(false);
                        setIsClientTypeDropdownOpen(false);
                        setIsClientPlanDropdownOpen(false);
                      }}
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
                      placeholder="e.g. 2608000015 (10-digit)"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      maxLength={10}
                      className="flex-1 ml-2 text-xs font-mono font-poppins-semibold text-[#0f172a] py-2"
                    />
                    {(() => {
                      const existingConn =
                        getExistingSubscriberConnection(newClientAccount);
                      if (existingConn) {
                        return (
                          <View className="bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex-row items-center">
                            <Ionicons
                              name="lock-closed"
                              size={11}
                              color="#e11d48"
                            />
                            <Text className="text-[10px] font-poppins-bold text-rose-700 ml-1">
                              {existingConn.port} ({existingConn.boxCode})
                            </Text>
                          </View>
                        );
                      }
                      if (matchedSubscriber) {
                        return (
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
                        );
                      }
                      if (newClientAccount.length === 10) {
                        return (
                          <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex-row items-center">
                            <Ionicons name="flash" size={11} color="#059669" />
                            <Text className="text-[10px] font-poppins-semibold text-emerald-700 ml-1">
                              New 10-Digit
                            </Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>

                  {/* Floating Expandable Directory Browser */}
                  {isSubscriberDirectoryOpen && (
                    <View
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 6,
                        zIndex: 100,
                      }}
                      className="p-3 bg-white rounded-2xl border border-slate-200 max-h-60 shadow-xl"
                    >
                      {liveDirectory.length === 0 ? (
                        <View className="py-5 items-center justify-center">
                          <Ionicons
                            name="folder-open-outline"
                            size={28}
                            color="#94a3b8"
                          />
                          <Text className="text-xs font-poppins-semibold text-[#64748b] mt-2">
                            Directory is empty (0 records)
                          </Text>
                          <Text className="text-[10px] font-poppins text-[#94a3b8] mt-0.5 text-center px-4">
                            No pre-registered subscribers found in the database.
                          </Text>
                        </View>
                      ) : (
                        <>
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-[11px] font-poppins-bold text-[#0f172a]">
                              Central Subscribers Directory (
                              {
                                liveDirectory.filter(
                                  (s: any) =>
                                    !getExistingSubscriberConnection(
                                      s.accountNumber,
                                    ) && s.status !== "ACTIVE",
                                ).length
                              }{" "}
                              pending)
                            </Text>
                            <Text className="text-[10px] font-poppins text-[#64748b]">
                              Tap pending subscriber to auto-fill
                            </Text>
                          </View>

                          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1 mb-2">
                            <Ionicons name="search" size={13} color="#94a3b8" />
                            <TextInput
                              value={directorySearchQuery}
                              onChangeText={setDirectorySearchQuery}
                              placeholder="Search by name, 10-digit account #, or plan..."
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
                            {liveDirectory
                              .filter((s: any) => {
                                const q = directorySearchQuery
                                  .toLowerCase()
                                  .trim();
                                const sName = (
                                  s.customerName ||
                                  s.name ||
                                  ""
                                ).toLowerCase();
                                const sAcc = (
                                  s.accountNumber || ""
                                ).toLowerCase();
                                const sPlan = (
                                  s.servicePlan ||
                                  s.plan ||
                                  ""
                                ).toLowerCase();
                                const sCat = (
                                  s.subscriberType ||
                                  s.category ||
                                  ""
                                ).toLowerCase();
                                return (
                                  q === "" ||
                                  sName.includes(q) ||
                                  sAcc.includes(q) ||
                                  sPlan.includes(q) ||
                                  sCat.includes(q)
                                );
                              })
                              .slice()
                              .sort((a: any, b: any) => {
                                const aConnected =
                                  Boolean(
                                    getExistingSubscriberConnection(
                                      a.accountNumber,
                                    ),
                                  ) || a.status === "ACTIVE";
                                const bConnected =
                                  Boolean(
                                    getExistingSubscriberConnection(
                                      b.accountNumber,
                                    ),
                                  ) || b.status === "ACTIVE";
                                if (aConnected === bConnected) return 0;
                                return aConnected ? 1 : -1;
                              })
                              .map((sub: any) => {
                                const existingConn =
                                  getExistingSubscriberConnection(
                                    sub.accountNumber,
                                  );
                                const isAlreadyConnected =
                                  Boolean(existingConn) ||
                                  sub.status === "ACTIVE";
                                const isCurrentlySelected =
                                  !isAlreadyConnected &&
                                  (newClientAccount === sub.accountNumber ||
                                    newClientAccount ===
                                      String(sub.accountNumber).replace(
                                        /\D/g,
                                        "",
                                      ));
                                return (
                                  <TouchableOpacity
                                    key={sub.accountNumber}
                                    disabled={isAlreadyConnected}
                                    onPress={() =>
                                      handleSelectFromDirectory(sub)
                                    }
                                    className={`p-2 rounded-xl border flex-row items-center justify-between mb-1 ${
                                      isAlreadyConnected
                                        ? "bg-slate-50 border-slate-200/70 opacity-60"
                                        : isCurrentlySelected
                                          ? "bg-[#FCF0DA] border-[#edd5a6]"
                                          : "bg-white border-slate-200/80"
                                    }`}
                                    activeOpacity={0.7}
                                  >
                                    <View className="flex-1 mr-2">
                                      <View className="flex-row items-center">
                                        <Text
                                          className={`text-xs font-mono font-poppins-bold mr-2 ${
                                            isAlreadyConnected
                                              ? "text-slate-400"
                                              : "text-[#4d6029]"
                                          }`}
                                        >
                                          {sub.accountNumber}
                                        </Text>
                                        <Text
                                          className={`text-xs font-poppins-bold flex-1 ${
                                            isAlreadyConnected
                                              ? "text-slate-500"
                                              : "text-[#0f172a]"
                                          }`}
                                          numberOfLines={1}
                                        >
                                          {sub.customerName || sub.name}
                                        </Text>
                                      </View>
                                      <Text
                                        className="text-[10px] font-poppins text-[#64748b]"
                                        numberOfLines={1}
                                      >
                                        {sub.subscriberType || sub.category} ·{" "}
                                        {sub.servicePlan || sub.plan}
                                      </Text>
                                    </View>
                                    {isAlreadyConnected ? (
                                      <View className="bg-slate-200/80 px-2 py-0.5 rounded flex-row items-center">
                                        <Ionicons
                                          name="lock-closed"
                                          size={9}
                                          color="#64748b"
                                        />
                                        <Text className="text-[9px] font-poppins-semibold text-[#475569] ml-1">
                                          {existingConn?.port ||
                                            sub.assignedPort ||
                                            "Assigned"}
                                        </Text>
                                      </View>
                                    ) : (
                                      <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                        <Text className="text-[9px] font-poppins-semibold text-amber-800">
                                          Pending
                                        </Text>
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                          </ScrollView>
                        </>
                      )}
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

                {/* 4. Subscriber Type Dropdown (Commercial vs Residential) */}
                <View
                  className="mb-3.5 relative"
                  style={{ zIndex: isClientTypeDropdownOpen ? 100 : 25 }}
                >
                  <Text className="text-xs font-poppins-bold text-[#0f172a] mb-1.5">
                    Subscriber Type (Classification) *
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsClientTypeDropdownOpen(!isClientTypeDropdownOpen);
                      setIsClientPlanDropdownOpen(false);
                      setIsClientPortDropdownOpen(false);
                      setIsSubscriberDirectoryOpen(false);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <Ionicons
                        name={
                          newClientType === "Commercial"
                            ? "business-outline"
                            : newClientType === "Residential"
                              ? "home-outline"
                              : "people-outline"
                        }
                        size={16}
                        color={newClientType ? "#4d6029" : "#64748b"}
                      />
                      <Text
                        className={`text-xs ml-2 ${
                          newClientType
                            ? "font-poppins-semibold text-[#0f172a]"
                            : "font-poppins-medium text-[#94a3b8]"
                        }`}
                      >
                        {newClientType || "+ Select Subscriber Type"}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        isClientTypeDropdownOpen ? "chevron-up" : "chevron-down"
                      }
                      size={16}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  {/* Floating Dropdown Panel for Subscriber Type */}
                  {isClientTypeDropdownOpen && (
                    <View
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 6,
                        zIndex: 100,
                      }}
                      className="bg-white border border-slate-200 rounded-2xl p-3"
                    >
                      {[
                        {
                          type: "Residential" as const,
                          name: "Residential",
                          badge: "Home",
                        },
                        {
                          type: "Commercial" as const,
                          name: "Commercial",
                          badge: "Business",
                        },
                      ].map((item) => {
                        const isSelected = newClientType === item.type;
                        return (
                          <TouchableOpacity
                            key={item.type}
                            onPress={() => {
                              setNewClientType(item.type);
                              setIsClientTypeDropdownOpen(false);
                              setSubscriberPlanFilter(item.type);
                            }}
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
                              <Text
                                className={`text-xs ml-2.5 font-poppins-medium ${
                                  isSelected
                                    ? "text-[#4d6029] font-poppins-semibold"
                                    : "text-[#0f172a]"
                                }`}
                              >
                                {item.name}
                              </Text>
                            </View>
                            <View className="bg-slate-100 px-2 py-0.5 rounded">
                              <Text className="text-[9px] font-poppins text-[#64748b]">
                                {item.badge}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* 5. Subscriber Plan Dropdown */}
                <View
                  className="mb-3.5 relative"
                  style={{ zIndex: isClientPlanDropdownOpen ? 100 : 20 }}
                >
                  <Text className="text-xs font-poppins-bold text-[#0f172a] mb-1.5">
                    Subscriber Plan *
                  </Text>
                  <View className="relative" style={{ zIndex: 100 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsClientPlanDropdownOpen(!isClientPlanDropdownOpen);
                        setIsClientTypeDropdownOpen(false);
                        setIsClientPortDropdownOpen(false);
                        setIsSubscriberDirectoryOpen(false);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between"
                      activeOpacity={0.8}
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <MaterialCommunityIcons
                          name="speedometer"
                          size={16}
                          color={newClientPlan ? "#4d6029" : "#64748b"}
                        />
                        <Text
                          className={`text-xs ml-2 flex-1 ${
                            newClientPlan
                              ? "font-poppins-semibold text-[#0f172a]"
                              : "font-poppins-medium text-[#94a3b8]"
                          }`}
                          numberOfLines={1}
                        >
                          {newClientPlan || "+ Add or Select Plan"}
                        </Text>
                      </View>
                      <Ionicons
                        name={
                          isClientPlanDropdownOpen
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={16}
                        color="#64748b"
                      />
                    </TouchableOpacity>

                    {/* Floating Dropdown Panel for Subscriber Plan */}
                    {isClientPlanDropdownOpen && (
                      <View
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: 6,
                          zIndex: 100,
                        }}
                        className="bg-white border border-slate-200 rounded-2xl p-3"
                      >
                        {/* Plan Category Filter Tabs */}
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
                          {["ALL", "Residential", "Commercial"].map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => setSubscriberPlanFilter(cat)}
                              className={`px-2.5 py-1 rounded-xl border ${
                                subscriberPlanFilter === cat
                                  ? "bg-[#4d6029] border-[#4d6029] shadow-xs"
                                  : "bg-white border-slate-200 shadow-xs"
                              }`}
                              activeOpacity={0.7}
                            >
                              <Text
                                className={`text-[11px] ${
                                  subscriberPlanFilter === cat
                                    ? "text-white font-poppins-bold"
                                    : "text-[#64748b] font-poppins-medium"
                                }`}
                              >
                                {cat === "ALL" ? "All" : cat}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        {/* Plan Item Checklist */}
                        <ScrollView
                          className="max-h-56"
                          contentContainerStyle={{ paddingVertical: 2 }}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {AVAILABLE_SUBSCRIBER_PLANS.filter(
                            (plan) =>
                              subscriberPlanFilter === "ALL" ||
                              plan.category === subscriberPlanFilter,
                          ).map((plan) => {
                            const isSelected = newClientPlan === plan.name;
                            return (
                              <TouchableOpacity
                                key={`${plan.category}-${plan.name}`}
                                onPress={() => {
                                  setNewClientPlan(plan.name);
                                  const match =
                                    plan.name.match(/(\d+)\s*Mbps/i);
                                  if (match) {
                                    setCustomPlanSpeed(match[1]);
                                  } else {
                                    setCustomPlanSpeed("");
                                  }
                                  setIsClientPlanDropdownOpen(false);
                                }}
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
                                  <Text
                                    className={`text-xs ml-2.5 font-poppins-medium ${
                                      isSelected
                                        ? "text-[#4d6029] font-poppins-semibold"
                                        : "text-[#0f172a]"
                                    }`}
                                  >
                                    {plan.name}
                                  </Text>
                                </View>
                                <View className="bg-slate-100 px-2 py-0.5 rounded">
                                  <Text className="text-[9px] font-poppins text-[#64748b]">
                                    {plan.category}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                {/* 6. Custom Speed (Mbps) Input Field */}
                <View className="mb-3.5">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Custom Speed (Mbps)
                    </Text>
                    <Text className="text-[10px] font-poppins text-[#64748b]">
                      Direct Mbps speed input
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1">
                    <MaterialCommunityIcons
                      name="speedometer"
                      size={16}
                      color={customPlanSpeed ? "#4d6029" : "#64748b"}
                    />
                    <TextInput
                      value={customPlanSpeed}
                      onChangeText={handleCustomPlanSpeedChange}
                      placeholder="e.g. 150, 250, 500"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      className="flex-1 ml-2 text-xs font-poppins-medium text-[#0f172a] py-2"
                    />
                    <View
                      className={`px-2.5 py-1 rounded-lg ${
                        customPlanSpeed ? "bg-[#4d6029]/15" : "bg-slate-200/60"
                      }`}
                    >
                      <Text
                        className={`text-xs font-poppins-bold ${
                          customPlanSpeed ? "text-[#4d6029]" : "text-[#64748b]"
                        }`}
                      >
                        Mbps
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-2 pt-4 border-t border-slate-100">
                <TouchableOpacity
                  onPress={handleSaveNewClient}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row shadow-sm"
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={15} color="#ffffff" />
                  <Text className="text-white text-xs font-poppins-bold ml-1.5">
                    Connect & Activate
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleQueueForFieldTech}
                  className="bg-[#FCF0DA] border border-[#edd5a6] px-3.5 py-3 rounded-xl items-center justify-center flex-row"
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="construct-outline"
                    size={14}
                    color="#78350f"
                  />
                  <Text className="text-[#78350f] text-xs font-poppins-bold ml-1.5">
                    Queue for Field Tech
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCloseAddClientModal}
                  className="px-3.5 py-3 bg-slate-100 rounded-xl items-center justify-center"
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
