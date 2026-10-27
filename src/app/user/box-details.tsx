import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { boxService } from "@/services/boxes";
import { logsService } from "@/services/logs";
import { SubscriberRecord, subscriberService } from "@/services/subscribers";
import {
  calculateDistanceInMeters,
  evaluateProximity,
  getCurrentLocationAsync,
} from "@/utils/geo";

const FALLBACK_PENDING_WORK_ORDERS: SubscriberRecord[] = [
  {
    accountNumber: "2608001018",
    customerName: "Marco Polo Villanueva",
    name: "Marco Polo Villanueva",
    subscriberType: "Residential",
    category: "Residential",
    servicePlan: "200 Mbps Fiber Plan",
    plan: "200 Mbps Fiber Plan",
    contactNumber: "0917-552-8410",
    address: "Purok 4, Tibanga, Iligan City",
    status: "PENDING_PROVISIONING",
  },
  {
    accountNumber: "2608001026",
    customerName: "Kape Iligan Roastery & Co.",
    name: "Kape Iligan Roastery & Co.",
    subscriberType: "Commercial",
    category: "Commercial",
    servicePlan: "300 Mbps Fiber Plan",
    plan: "300 Mbps Fiber Plan",
    contactNumber: "0918-334-9102",
    address: "Quezon Ave, Poblacion, Iligan City",
    status: "PENDING_PROVISIONING",
  },
  {
    accountNumber: "2608001034",
    customerName: "Elena Grace Macapagal",
    name: "Elena Grace Macapagal",
    subscriberType: "Residential",
    category: "Residential",
    servicePlan: "100 Mbps Fiber Plan",
    plan: "100 Mbps Fiber Plan",
    contactNumber: "0998-741-2095",
    address: "Zamora St, San Miguel, Iligan City",
    status: "PENDING_PROVISIONING",
  },
  {
    accountNumber: "2608001042",
    customerName: "Mindanao Tech Hub Solutions",
    name: "Mindanao Tech Hub Solutions",
    subscriberType: "Commercial",
    category: "Commercial",
    servicePlan: "300 Mbps Fiber Plan",
    plan: "300 Mbps Fiber Plan",
    contactNumber: "0917-890-4412",
    address: "Andres Bonifacio Ave, Saray, Iligan City",
    status: "PENDING_PROVISIONING",
  },
  {
    accountNumber: "2608001059",
    customerName: "Dr. Rafael Mendoza Clinic",
    name: "Dr. Rafael Mendoza Clinic",
    subscriberType: "Commercial",
    category: "Commercial",
    servicePlan: "200 Mbps Fiber Plan",
    plan: "200 Mbps Fiber Plan",
    contactNumber: "0920-614-3381",
    address: "Roxas Ave, Mahayahay, Iligan City",
    status: "PENDING_PROVISIONING",
  },
  {
    accountNumber: "2608001067",
    customerName: "Hannah Mae Alcantara",
    name: "Hannah Mae Alcantara",
    subscriberType: "Residential",
    category: "Residential",
    servicePlan: "100 Mbps Fiber Plan",
    plan: "100 Mbps Fiber Plan",
    contactNumber: "0915-409-7731",
    address: "Bro. Jeffrey Rd, Pala-o, Iligan City",
    status: "PENDING_PROVISIONING",
  },
];

const FIBER_PLAN_OPTIONS = [
  "50 Mbps Fiber Plan",
  "100 Mbps Fiber Plan",
  "200 Mbps Fiber Plan",
  "300 Mbps Fiber Plan",
];

export interface HardwareEquipmentItem {
  id: string;
  name: string;
  type: string;
  category?: string;
  serial?: string;
  status: string;
}

export interface ClientConnectionItem {
  id?: string;
  port: string;
  portNumber?: number;
  accountNumber: string;
  name: string;
  clientType?: string;
  plan?: string;
  status: string;
  signalDbm?: string | null;
}

export interface BoxDetailData {
  id: string;
  code: string;
  category: "MAIN_BOX" | "SUB_BOX" | string;
  parentCode?: string | null;
  parentBoxId?: string | null;
  siteName: string;
  address: string;
  zone?: string;
  latitude: number;
  longitude: number;
  mountingType?: string;
  poleNumber?: string | null;
  totalPorts: number;
  portsUsed?: number;
  activePorts?: number;
  status: "ACTIVE" | "NEEDS_TAG" | "ISSUE" | string;
  qrToken?: string;
  opticalLoss?: string;
  temperature?: string;
  circuitBreaker?: string;
  voltage?: string;
  lastScannedBy?: string;
  lastScannedAt?: string;
  equipment?: HardwareEquipmentItem[];
  equipmentItems?: string[];
  clients?: ClientConnectionItem[];
  clientsCount?: number;
  notes?: string | null;
  tier?: string | null;
  subscriberType?: string | null;
  clientType?: string | null;
  latestScanDistanceMeters?: number | null;
  latestScanLocationVerified?: boolean;
  latestIssue?: {
    notes: string;
    reportedBy?: string;
    reportedAt?: string;
    padlockVerified?: boolean;
    issueType?: string;
  } | null;
}

export default function BoxDetailsScreen() {
  const localParams = useLocalSearchParams<{
    code?: string;
    id?: string;
    distanceMeters?: string;
    locationVerified?: string;
    proximityStatus?: string;
  }>();
  const globalParams = useGlobalSearchParams<{
    code?: string;
    id?: string;
    distanceMeters?: string;
    locationVerified?: string;
    proximityStatus?: string;
  }>();
  const params = (localParams && (localParams.id || localParams.code)) ? localParams : globalParams;
  const boxIdentifier = (params.id || params.code || "DB-MN-01").trim();

  // Dynamic box state
  const [box, setBox] = useState<BoxDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proximity evaluation: check route params from scan first, then fallback to box data
  const resolvedDistanceMeters = useMemo(() => {
    if (params.distanceMeters !== undefined && params.distanceMeters !== "") {
      const num = Number(params.distanceMeters);
      return Number.isNaN(num) ? null : num;
    }
    if (box?.latestScanDistanceMeters !== undefined && box?.latestScanDistanceMeters !== null) {
      const num = Number(box.latestScanDistanceMeters);
      return Number.isNaN(num) ? null : num;
    }
    return null;
  }, [params.distanceMeters, box?.latestScanDistanceMeters]);

  const proximityInfo = useMemo(
    () => evaluateProximity(resolvedDistanceMeters),
    [resolvedDistanceMeters]
  );

  // Field audit modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [auditNotes, setAuditNotes] = useState("");
  const [padlockVerified, setPadlockVerified] = useState(true);
  const [auditStatus, setAuditStatus] = useState<string>("ACTIVE");
  const [selectedIssueType, setSelectedIssueType] = useState<string>(
    "Defective Port / Splitter"
  );

  // Interactive Port Assignment & Drop Cable Activation state
  const [selectedPortNumber, setSelectedPortNumber] = useState<number | null>(
    null
  );
  const [isAssignPortModalOpen, setIsAssignPortModalOpen] = useState(false);
  const [selectedPortClient, setSelectedPortClient] =
    useState<ClientConnectionItem | null>(null);
  const [isPortInspectorModalOpen, setIsPortInspectorModalOpen] =
    useState(false);
  const [showConfirmReleasePort, setShowConfirmReleasePort] = useState(false);
  const [isSubmittingPortAction, setIsSubmittingPortAction] = useState(false);

  // Pending installation work orders & subscriber assignment fields
  const [pendingWorkOrders, setPendingWorkOrders] = useState<
    SubscriberRecord[]
  >(FALLBACK_PENDING_WORK_ORDERS);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  const [workOrderSearch, setWorkOrderSearch] = useState("");
  const [selectedWorkOrderAcc, setSelectedWorkOrderAcc] = useState<
    string | null
  >(null);
  const [assignAccountNumber, setAssignAccountNumber] = useState("");
  const [assignSubscriberName, setAssignSubscriberName] = useState("");
  const [assignSubscriberType, setAssignSubscriberType] = useState<
    "Residential" | "Commercial"
  >("Residential");
  const [assignServicePlan, setAssignServicePlan] = useState<string>(
    "100 Mbps Fiber Plan"
  );

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load pending installation work orders for drop cable activation
  const loadPendingWorkOrders = useCallback(
    async (currentClients: ClientConnectionItem[] = []) => {
      try {
        setLoadingWorkOrders(true);
        const res = await subscriberService.getAllSubscribers();
        const connectedAccounts = new Set(
          currentClients.map((c) => String(c.accountNumber).trim())
        );

        if (res.success && Array.isArray(res.subscribers) && res.subscribers.length > 0) {
          const pendingOnly = res.subscribers.filter(
            (s) =>
              !connectedAccounts.has(String(s.accountNumber).trim()) &&
              (s.status === "PENDING_PROVISIONING" || !s.assignedBoxId)
          );
          if (pendingOnly.length > 0) {
            setPendingWorkOrders(pendingOnly);
            return;
          }
        }
        // Fallback to local pending work orders not already on this box
        setPendingWorkOrders(
          FALLBACK_PENDING_WORK_ORDERS.filter(
            (s) => !connectedAccounts.has(String(s.accountNumber).trim())
          )
        );
      } catch {
        setPendingWorkOrders(FALLBACK_PENDING_WORK_ORDERS);
      } finally {
        setLoadingWorkOrders(false);
      }
    },
    []
  );

  const handleTapPortTile = (
    portNum: number,
    occupant: ClientConnectionItem | null
  ) => {
    setSelectedPortNumber(portNum);
    if (occupant) {
      setSelectedPortClient(occupant);
      setShowConfirmReleasePort(false);
      setIsPortInspectorModalOpen(true);
    } else {
      setWorkOrderSearch("");
      setSelectedWorkOrderAcc(null);
      setAssignAccountNumber("");
      setAssignSubscriberName("");
      setAssignSubscriberType("Residential");
      setAssignServicePlan("100 Mbps Fiber Plan");
      setIsAssignPortModalOpen(true);
      loadPendingWorkOrders(box?.clients || []);
    }
  };

  const handleSelectWorkOrder = (order: SubscriberRecord) => {
    const cleanAcc = String(order.accountNumber).trim();
    setSelectedWorkOrderAcc(cleanAcc);
    setAssignAccountNumber(cleanAcc);
    setAssignSubscriberName(order.customerName || order.name || "");
    const rawType = (order.subscriberType || order.category || "").toUpperCase();
    setAssignSubscriberType(
      rawType.includes("COMMERCIAL") ? "Commercial" : "Residential"
    );
    setAssignServicePlan(
      order.servicePlan || order.plan || "100 Mbps Fiber Plan"
    );
  };

  const handleGenerateAccountNumber = async () => {
    try {
      const res = await subscriberService.getNextAccountNumber();
      if (res.success && res.accountNumber) {
        setAssignAccountNumber(res.accountNumber);
        setSelectedWorkOrderAcc(null);
      }
    } catch {
      // Fallback handled in service
    }
  };

  const handleConfirmAssignDropWire = async () => {
    if (!box || !selectedPortNumber) return;
    const cleanName = assignSubscriberName.trim();
    const cleanAcc = assignAccountNumber.trim();

    if (!cleanName) {
      showToast("Please select a pending work order or enter subscriber name.", "error");
      return;
    }
    if (!cleanAcc) {
      showToast("Please enter or generate a subscriber account number.", "error");
      return;
    }

    try {
      setIsSubmittingPortAction(true);
      const res = await boxService.assignClient(box.id, {
        port: `Port ${selectedPortNumber}`,
        accountNumber: cleanAcc,
        name: cleanName,
        clientType: assignSubscriberType,
        plan: assignServicePlan,
        preventOverwrite: true,
      });

      if (!res.success) {
        showToast(
          res.message || `Port P${selectedPortNumber} could not be assigned.`,
          "error"
        );
        fetchBoxDetails(true);
        return;
      }

      // Optimistically update local box state immediately so P{portNum} locks in green
      const newClientItem: ClientConnectionItem = {
        id: res.client?.id || `port-${selectedPortNumber}-${cleanAcc}`,
        port: `Port ${selectedPortNumber}`,
        portNumber: selectedPortNumber,
        accountNumber: cleanAcc,
        name: cleanName,
        clientType: assignSubscriberType,
        plan: assignServicePlan,
        status: "CONNECTED",
      };

      setBox((prev) => {
        if (!prev) return prev;
        const filtered = (prev.clients || []).filter(
          (c) =>
            c.portNumber !== selectedPortNumber &&
            c.port !== `Port ${selectedPortNumber}` &&
            parseInt(String(c.port || "").replace(/\D/g, ""), 10) !==
              selectedPortNumber
        );
        const nextClients = [...filtered, newClientItem].sort((a, b) => {
          const pA =
            a.portNumber ||
            parseInt(String(a.port || "").replace(/\D/g, ""), 10) ||
            0;
          const pB =
            b.portNumber ||
            parseInt(String(b.port || "").replace(/\D/g, ""), 10) ||
            0;
          return pA - pB;
        });
        const nextActive = nextClients.filter(
          (c) => c.status === "CONNECTED" || c.status === "ACTIVE"
        ).length;
        return {
          ...prev,
          clients: nextClients,
          clientsCount: nextClients.length,
          activePorts: nextActive,
          portsUsed: nextActive,
        };
      });

      setIsAssignPortModalOpen(false);
      showToast(
        `Drop wire activated on Port P${selectedPortNumber} for ${cleanName}!`
      );
      fetchBoxDetails(true);
    } catch (err: any) {
      showToast(err.message || "Failed to activate drop wire.", "error");
    } finally {
      setIsSubmittingPortAction(false);
    }
  };

  const handleTogglePortStatus = async () => {
    if (!box || !selectedPortNumber || !selectedPortClient) return;
    try {
      setIsSubmittingPortAction(true);
      const res = await boxService.toggleClientStatus(
        box.id,
        String(selectedPortNumber)
      );
      if (res.success) {
        const nextStatus =
          selectedPortClient.status === "CONNECTED"
            ? "DISCONNECTED"
            : "CONNECTED";
        setSelectedPortClient({ ...selectedPortClient, status: nextStatus });
        showToast(
          `Port P${selectedPortNumber} marked as ${nextStatus}.`
        );
        fetchBoxDetails(true);
      } else {
        showToast(res.message || "Failed to update port status.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update port status.", "error");
    } finally {
      setIsSubmittingPortAction(false);
    }
  };

  const handleReleasePort = async () => {
    if (!box || !selectedPortNumber) return;
    try {
      setIsSubmittingPortAction(true);
      const res = await boxService.removeClient(
        box.id,
        String(selectedPortNumber)
      );
      if (res.success) {
        setShowConfirmReleasePort(false);
        setIsPortInspectorModalOpen(false);
        showToast(
          `Port P${selectedPortNumber} disconnected and released for field allocation.`
        );
        fetchBoxDetails(true);
      } else {
        showToast(res.message || "Failed to release port.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to release port.", "error");
    } finally {
      setIsSubmittingPortAction(false);
    }
  };

  // Load box details from backend API
  const fetchBoxDetails = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        setError(null);

        const res = await boxService.getById(boxIdentifier);
        if (res.success && res.box) {
          setBox(res.box);
        } else {
          // Fallback: search all boxes if direct getById didn't resolve
          const allRes = await boxService.getAll();
          if (allRes.success && Array.isArray(allRes.boxes)) {
            const match = allRes.boxes.find(
              (b) =>
                b.id === boxIdentifier ||
                b.code?.toUpperCase() === boxIdentifier.toUpperCase() ||
                b.qrToken === boxIdentifier,
            );
            if (match) {
              setBox(match);
            } else {
              setError(
                res.message || `Distribution box "${boxIdentifier}" not found.`,
              );
            }
          } else {
            setError(
              res.message || `Distribution box "${boxIdentifier}" not found.`,
            );
          }
        }
      } catch (err: any) {
        console.error("Failed to load box details:", err);
        setError(err.message || "Failed to connect to box database.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [boxIdentifier],
  );

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await boxService.getById(boxIdentifier);
        if (!isMounted) return;
        if (res.success && res.box) {
          setBox(res.box);
        } else {
          const allRes = await boxService.getAll();
          if (!isMounted) return;
          if (allRes.success && Array.isArray(allRes.boxes)) {
            const match = allRes.boxes.find(
              (b) =>
                b.id === boxIdentifier ||
                b.code?.toUpperCase() === boxIdentifier.toUpperCase() ||
                b.qrToken === boxIdentifier,
            );
            if (match) {
              setBox(match);
            } else {
              setError(
                res.message || `Distribution box "${boxIdentifier}" not found.`,
              );
            }
          } else {
            setError(
              res.message || `Distribution box "${boxIdentifier}" not found.`,
            );
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load box details:", err);
        setError(err.message || "Failed to connect to box database.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [boxIdentifier]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/user/scanner");
    }
  };

  const handleOpenAuditModal = () => {
    if (!box) return;
    const initialStatus = box.status || "ACTIVE";
    setAuditStatus(initialStatus);

    // If box currently has an issue, preselect its existing problem type if recorded
    let initialIssueType = "Defective Port / Splitter";
    if (initialStatus === "ISSUE" && box.latestIssue?.notes) {
      const match = box.latestIssue.notes.match(/^\[(.*?)\]/);
      if (match && match[1]) {
        initialIssueType = match[1];
      }
    }
    setSelectedIssueType(initialIssueType);

    // Sync padlock verification: if Broken Lock, padlockVerified is false
    if (
      initialStatus === "ISSUE" &&
      (initialIssueType === "Broken Lock / Door" ||
        box.latestIssue?.padlockVerified === false)
    ) {
      setPadlockVerified(false);
    } else {
      setPadlockVerified(true);
    }

    setAuditNotes("");
    setShowConfirmSubmitModal(false);
    setIsAuditModalOpen(true);
  };

  const handleSelectStatus = (st: "ACTIVE" | "NEEDS_TAG" | "ISSUE") => {
    setAuditStatus(st);
    if (st === "ISSUE") {
      if (!selectedIssueType) {
        setSelectedIssueType("Defective Port / Splitter");
      }
      if (selectedIssueType === "Broken Lock / Door") {
        setPadlockVerified(false);
      }
    } else {
      setPadlockVerified(true);
    }
  };

  const handleSelectIssueType = (issueId: string) => {
    setSelectedIssueType(issueId);
    if (issueId === "Broken Lock / Door") {
      setPadlockVerified(false);
    } else if (!padlockVerified && selectedIssueType === "Broken Lock / Door") {
      setPadlockVerified(true);
    }
  };

  const handleTogglePadlock = () => {
    const nextPadlock = !padlockVerified;
    setPadlockVerified(nextPadlock);
    if (!nextPadlock) {
      // Unlatched / broken padlock automatically selects ISSUE and Broken Lock / Door!
      setAuditStatus("ISSUE");
      setSelectedIssueType("Broken Lock / Door");
    } else if (selectedIssueType === "Broken Lock / Door") {
      setSelectedIssueType("Defective Port / Splitter");
    }
  };

  const handleSubmitAudit = async () => {
    if (!box) return;
    try {
      setIsSubmittingAudit(true);
      let fullNotes = auditNotes.trim();
      if (auditStatus === "ISSUE") {
        fullNotes = fullNotes
          ? `[${selectedIssueType}] ${fullNotes}`
          : `[${selectedIssueType}] Hardware problem reported during field inspection`;
      } else if (!fullNotes) {
        fullNotes =
          auditStatus === "ACTIVE"
            ? "Field inspection passed. Enclosure & hardware operational."
            : "Field inspection complete. Pending QR placard affixing.";
      }

      let scanLat: number | null = null;
      let scanLon: number | null = null;
      let distanceMeters: number | null = null;
      let locationVerified = true;

      const deviceCoords = await getCurrentLocationAsync(3500);
      if (deviceCoords) {
        scanLat = deviceCoords.latitude;
        scanLon = deviceCoords.longitude;

        if (box.latitude && box.longitude) {
          const bLat = Number(box.latitude);
          const bLon = Number(box.longitude);
          if (!Number.isNaN(bLat) && !Number.isNaN(bLon)) {
            distanceMeters = calculateDistanceInMeters(bLat, bLon, scanLat, scanLon);
            const evaluation = evaluateProximity(distanceMeters);
            locationVerified = evaluation.isVerified;
          }
        }
      }

      const res = await logsService.recordScan({
        boxId: box.id,
        boxCode: box.code,
        scanType: "ROUTINE_AUDIT",
        padlockVerified,
        auditNotes: fullNotes,
        boxStatusAtScan: auditStatus,
        scanLatitude: scanLat ?? undefined,
        scanLongitude: scanLon ?? undefined,
        distanceMeters,
        locationVerified,
      });

      if (res.success) {
        if (auditStatus !== box.status) {
          await boxService.update(box.id, { status: auditStatus });
        }
        setShowConfirmSubmitModal(false);
        setIsAuditModalOpen(false);
        showToast(
          auditStatus === "ISSUE"
            ? `Hardware issue logged for ${box.code}`
            : `Inspection for ${box.code} recorded successfully!`
        );
        fetchBoxDetails(true);
      } else {
        throw new Error(res.message || "Failed to record inspection");
      }
    } catch (err: any) {
      console.error("Error submitting inspection:", err);
      showToast(err.message || "Failed to submit inspection.", "error");
      setShowConfirmSubmitModal(false);
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          bg: "bg-[#AEAC78]/25",
          border: "border-[#AEAC78]/80",
          text: "text-[#2d3416]",
          dot: "bg-[#AEAC78]",
          label: "Active & Verified",
        };
      case "NEEDS_TAG":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-700",
          dot: "bg-amber-500",
          label: "Pending Tagging",
        };
      case "ISSUE":
        return {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
          dot: "bg-rose-500",
          label: "Alarm / Issue",
        };
      default:
        return {
          bg: "bg-slate-50",
          border: "border-slate-200",
          text: "text-slate-700",
          dot: "bg-slate-500",
          label: status,
        };
    }
  };

  // Fallback hardware list if box has no registered catalog hardware
  const getDisplayEquipment = (
    boxData: BoxDetailData,
  ): HardwareEquipmentItem[] => {
    if (boxData.equipment && boxData.equipment.length > 0) {
      return boxData.equipment;
    }
    return [
      {
        id: "eq-split",
        name:
          boxData.category === "MAIN_BOX"
            ? "Main Optical Feeder 24-Port"
            : "1:16 PLC Cassette Splitter",
        type: "Optical Splitter",
        category: "Optical Equipment",
        serial: `SPL-${boxData.code}`,
        status: "Operational",
      },
      {
        id: "eq-adp",
        name: "SC/UPC Fiber Coupler Panel",
        type: "Coupler Plate",
        category: "Optical Equipment",
        serial: `ADP-${boxData.code}`,
        status: "Operational",
      },
      {
        id: "eq-brk",
        name: boxData.circuitBreaker || "20A DIN-Rail MCB",
        type: "Circuit Breaker",
        category: "Circuit / Internal Management",
        serial: `CB-${boxData.code}`,
        status: "Operational",
      },
      {
        id: "eq-tray",
        name: "Fiber Splice Protection Sleeves",
        type: "Splice Tray",
        category: "Protection Hardware",
        serial: `SPT-${boxData.code}`,
        status: "Operational",
      },
    ];
  };

  // Loading Screen
  if (loading && !box) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-[#f8fafc] items-center justify-center p-6"
      >
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#4d6029" />
        <Text className="text-sm font-poppins-medium text-[#475569] mt-3">
          Loading box specifications...
        </Text>
      </SafeAreaView>
    );
  }

  // Error Screen
  if (error && !box) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-[#f8fafc] items-center justify-center p-6"
      >
        <StatusBar style="dark" />
        <View className="w-16 h-16 rounded-3xl bg-rose-100 items-center justify-center mb-4">
          <Ionicons name="alert-circle" size={32} color="#e11d48" />
        </View>
        <Text className="text-lg font-poppins-bold text-[#0f172a] text-center mb-1">
          Box Not Found
        </Text>
        <Text className="text-xs font-poppins text-[#64748b] text-center mb-6 max-w-xs">
          {error}
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={handleGoBack}
            className="bg-slate-200 px-5 py-2.5 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-xs font-poppins-semibold text-[#334155]">
              Go Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => fetchBoxDetails(false)}
            className="bg-[#4d6029] px-5 py-2.5 rounded-xl flex-row items-center"
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh"
              size={14}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs font-poppins-bold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!box) return null;

  // Untagged Box: Block view until physical QR tag is affixed
  if (box.status === "NEEDS_TAG") {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-[#f8fafc] items-center justify-center p-6"
      >
        <StatusBar style="dark" />
        <View className="w-16 h-16 rounded-3xl bg-amber-100 items-center justify-center mb-4 border border-amber-200">
          <Ionicons name="pricetag-outline" size={32} color="#d97706" />
        </View>
        <Text className="text-lg font-poppins-bold text-[#0f172a] text-center mb-1">
          Box Details Unavailable
        </Text>
        <View className="bg-amber-100 border border-amber-200 px-3 py-1 rounded-full mb-3">
          <Text className="text-xs font-poppins-bold text-amber-800">
            {box.code} · Needs Tag
          </Text>
        </View>
        <Text className="text-xs font-poppins text-[#64748b] text-center mb-6 max-w-xs leading-relaxed">
          This distribution box has not been affixed with a physical QR placard on-site. Specifications, port configurations, and hardware telemetry cannot be viewed until the box is physically tagged.
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={handleGoBack}
            className="bg-slate-200 px-5 py-2.5 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-xs font-poppins-semibold text-[#334155]">
              Go Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/user/scanner")}
            className="bg-[#4d6029] px-5 py-2.5 rounded-xl flex-row items-center shadow-xs"
            activeOpacity={0.8}
          >
            <Ionicons
              name="qr-code-outline"
              size={14}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs font-poppins-bold text-white">
              Open Scanner
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayEquipment = getDisplayEquipment(box);
  const statusInfo = getStatusBadge(box.status);
  const portsOccupied =
    box.portsUsed ?? box.activePorts ?? (box.clients ? box.clients.length : 0);

  const totalPortsCount = Math.max(1, Number(box.totalPorts) || 8);
  const portColumns = 6;
  const portRows = Array.from(
    { length: Math.ceil(totalPortsCount / portColumns) },
    (_, rowIdx) =>
      Array.from({ length: portColumns }, (__, colIdx) => {
        const portNum = rowIdx * portColumns + colIdx + 1;
        return portNum <= totalPortsCount ? portNum : null;
      })
  );

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <StatusBar style="light" />

      {/* Top Safe Area & Main Header Banner */}
      <SafeAreaView edges={["top"]} className="bg-[#4d6029] shadow-md z-20">
        <View className="bg-[#4d6029] px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2.5">
            {/* Back Button */}
            <TouchableOpacity
              onPress={handleGoBack}
              className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-2.5 shrink-0 active:bg-white/30"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Box Brand Icon */}
            <View className="w-9 h-9 rounded-2xl bg-white/20 items-center justify-center mr-2.5 border border-white/30 shrink-0">
              <MaterialCommunityIcons
                name="cube-outline"
                size={20}
                color="#ffffff"
              />
            </View>

            {/* Box Header Info */}
            <View className="flex-1">
              <Text
                className="text-[15px] font-poppins-bold text-white leading-tight"
                numberOfLines={1}
              >
                {box.code}
              </Text>
              <Text
                className="text-[11px] font-poppins text-white/80 mt-0.5"
                numberOfLines={1}
              >
                {box.siteName}
              </Text>
            </View>
          </View>

          {/* Header Action Buttons */}
          <TouchableOpacity
            onPress={handleOpenAuditModal}
            className="bg-white/25 border border-white/30 px-3 py-1.5 rounded-xl flex-row items-center shrink-0 active:bg-white/35"
          >
            <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
            <Text className="text-[11px] font-poppins-bold text-white ml-1.5">
              Inspect
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <View
          className={`mx-4 mt-2 px-4 py-3 rounded-2xl flex-row items-center justify-between shadow-lg z-50 border ${
            toastType === "error"
              ? "bg-rose-900 border-rose-500"
              : "bg-[#4d6029] border-[#3e4e20]"
          }`}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons
              name={toastType === "error" ? "alert-circle" : "checkmark-circle"}
              size={18}
              color="#ffffff"
            />
            <Text className="text-xs font-poppins-bold text-white ml-2 flex-1">
              {toastMessage}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Scrollable Page Body */}
      <ScrollView
        className="flex-1 px-3.5 pt-3.5"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBoxDetails(true)}
            tintColor="#4d6029"
          />
        }
      >
        <View className="max-w-2xl w-full self-center">
          {/* GPS Proximity Guard: Location Mismatch Alert Banner */}
          {proximityInfo.status === "MISMATCH" && (
            <View className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 mb-3.5 shadow-sm">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-xl bg-rose-500/15 items-center justify-center mr-2.5 shrink-0">
                    <Ionicons name="location-outline" size={18} color="#dc2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-poppins-bold text-rose-900">
                      Scan Location Mismatch Detected
                    </Text>
                    <Text className="text-[10px] font-poppins text-rose-600">
                      Anti-Cheating Geolocation Guard
                    </Text>
                  </View>
                </View>
                <View className="bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg shrink-0">
                  <Text className="text-[9px] font-poppins-bold text-rose-800">
                    FLAGGED ({proximityInfo.formattedDistance})
                  </Text>
                </View>
              </View>
              <Text className="text-xs font-poppins text-rose-800">
                You scanned this box <Text className="font-poppins-bold">{proximityInfo.formattedDistance}</Text> away from its registered pole coordinates. This physical audit scan has been flagged in central security logs for review.
              </Text>
            </View>
          )}

          {/* GPS Proximity Guard: Verified On-Site Banner */}
          {proximityInfo.status === "ON_SITE" && (
            <View className="bg-emerald-50 border border-emerald-200/90 rounded-2xl px-3.5 py-2.5 mb-3.5 flex-row items-center justify-between shadow-xs">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <View className="ml-2 flex-1">
                  <Text className="text-xs font-poppins-bold text-emerald-800">
                    Physical On-Site Verified
                  </Text>
                  <Text className="text-[10px] font-poppins text-emerald-600">
                    Scanned {proximityInfo.formattedDistance} from registered pole coordinates
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                <Text className="text-[9px] font-poppins-bold text-emerald-700">
                  SECURE
                </Text>
              </View>
            </View>
          )}

          {/* GPS Proximity Guard: Nearby Tolerance Banner */}
          {proximityInfo.status === "NEARBY" && (
            <View className="bg-amber-50 border border-amber-200/90 rounded-2xl px-3.5 py-2.5 mb-3.5 flex-row items-center justify-between shadow-xs">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="location" size={16} color="#d97706" />
                <View className="ml-2 flex-1">
                  <Text className="text-xs font-poppins-bold text-amber-800">
                    Nearby Pole ({proximityInfo.formattedDistance})
                  </Text>
                  <Text className="text-[10px] font-poppins text-amber-600">
                    Within acceptable physical setback tolerance
                  </Text>
                </View>
              </View>
              <View className="bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
                <Text className="text-[9px] font-poppins-bold text-amber-700">
                  ACCEPTABLE
                </Text>
              </View>
            </View>
          )}

          {/* Active Hardware Issue Alert Banner */}
          {box.status === "ISSUE" && (
            <View className="bg-rose-50 border border-rose-200/90 rounded-3xl p-4 mb-3.5 shadow-xs">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-xl bg-rose-500/15 items-center justify-center mr-2.5 shrink-0">
                    <Ionicons name="warning" size={17} color="#dc2626" />
                  </View>
                  <Text className="text-xs font-poppins-bold text-rose-900 flex-1">
                    Active Hardware Issue Reported
                  </Text>
                </View>
                <View className="bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg shrink-0">
                  <Text className="text-[9px] font-poppins-bold text-rose-800">
                    NEEDS REPAIR
                  </Text>
                </View>
              </View>
              <Text className="text-xs font-poppins text-rose-800">
                {box.latestIssue?.notes ||
                  box.notes ||
                  "Hardware problem or physical degradation reported. Inspection and repair required."}
              </Text>
              {box.latestIssue?.reportedBy && (
                <Text className="text-[10px] font-poppins text-rose-500 mt-1">
                  Reported by {box.latestIssue.reportedBy} · {box.latestIssue.reportedAt}
                </Text>
              )}
            </View>
          )}

          {/* 1. Classification & Hierarchy Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-4 mb-3.5 shadow-xs">
            <View
              className={`flex-row items-center justify-between ${
                box.category === "SUB_BOX" && !!box.parentCode ? "mb-3" : ""
              }`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View
                  className={`w-10 h-10 rounded-2xl items-center justify-center mr-2.5 shrink-0 ${
                    box.category === "MAIN_BOX"
                      ? "bg-[#4d6029]/10"
                      : "bg-amber-500/10"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="server-network"
                    size={20}
                    color={box.category === "MAIN_BOX" ? "#4d6029" : "#b45309"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[13px] font-poppins-bold text-[#0f172a]"
                    numberOfLines={1}
                  >
                    {box.category === "MAIN_BOX"
                      ? "Main Distribution Box"
                      : "Sub-Distribution Box"}
                  </Text>
                </View>
              </View>

              {/* Status Pill */}
              <View
                className={`px-2.5 py-1 rounded-xl flex-row items-center border shrink-0 ${statusInfo.bg} ${statusInfo.border}`}
              >
                <View
                  className={`w-2 h-2 rounded-full mr-1.5 ${statusInfo.dot}`}
                />
                <Text
                  className={`text-[10px] font-poppins-bold ${statusInfo.text}`}
                >
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            {/* Parent Box reference for Sub Boxes */}
            {box.category === "SUB_BOX" && !!box.parentCode && (
              <View className="pt-3 border-t border-slate-100 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons
                    name="git-network-outline"
                    size={14}
                    color="#64748b"
                  />
                  <Text className="text-xs font-poppins-medium text-[#475569] ml-1.5">
                    Parent Feeder Box:
                  </Text>
                </View>
                <View className="bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
                  <Text className="text-xs font-mono font-bold text-[#0f172a]">
                    {box.parentCode}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 2. Location & GIS Coordinates Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-4 mb-3.5 shadow-xs">
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-2.5 mt-0.5 shrink-0">
                <Ionicons name="location" size={18} color="#4d6029" />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-poppins-bold text-[#0f172a]">
                  {box.siteName}
                </Text>
                <Text className="text-xs font-poppins text-[#64748b] mt-0.5 leading-relaxed">
                  {box.address}
                </Text>
                <Text className="text-[11px] font-poppins text-slate-500 mt-1">
                  Latitude:{" "}
                  <Text className="font-mono text-[#0f172a]">
                    {Number(box.latitude).toFixed(4)}
                  </Text>
                  {" · "}
                  Longitude:{" "}
                  <Text className="font-mono text-[#0f172a]">
                    {Number(box.longitude).toFixed(4)}
                  </Text>
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
              <View className="flex-row items-center">
                <Ionicons
                  name={proximityInfo.isVerified ? "shield-checkmark" : "warning"}
                  size={13}
                  color={proximityInfo.isVerified ? "#059669" : "#dc2626"}
                />
                <Text className="text-[10px] font-poppins-semibold text-slate-500 ml-1.5">
                  Proximity Guard:
                </Text>
              </View>
              <View
                className={`px-2 py-0.5 rounded-md border shrink-0 ${proximityInfo.badgeBg} ${proximityInfo.badgeBorder}`}
              >
                <Text
                  className={`text-[10px] font-poppins-bold ${proximityInfo.badgeText}`}
                >
                  {proximityInfo.badgeLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Hardware Equipment Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-4 mb-3.5 shadow-xs">
            <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5 shrink-0">
                  <MaterialCommunityIcons
                    name="tools"
                    size={16}
                    color="#4d6029"
                  />
                </View>
                <Text
                  className="text-[13px] font-poppins-bold text-[#0f172a] flex-1"
                  numberOfLines={1}
                >
                  Hardware Equipment
                </Text>
              </View>
              <View className="bg-[#4d6029]/10 border border-[#4d6029]/20 px-2.5 py-0.5 rounded-full shrink-0">
                <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                  {displayEquipment.length} Items Installed
                </Text>
              </View>
            </View>

            <View className="gap-2">
              {displayEquipment.map((item) => (
                <View
                  key={item.id}
                  className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-xl bg-[#4d6029] items-center justify-center mr-2.5 shrink-0">
                      <MaterialCommunityIcons
                        name={
                          (item.type || "").toLowerCase().includes("splitter")
                            ? "resistor-nodes"
                            : (item.type || "")
                                  .toLowerCase()
                                  .includes("breaker")
                              ? "flash"
                              : "shield-check"
                        }
                        size={16}
                        color="#ffffff"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-xs font-poppins-bold text-[#0f172a] leading-snug"
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      <Text
                        className="text-[10px] font-poppins text-[#64748b] mt-0.5"
                        numberOfLines={1}
                      >
                        {item.type} {item.serial ? `· SN: ${item.serial}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2 py-0.5 rounded-lg flex-row items-center shrink-0">
                    <View className="w-1.5 h-1.5 rounded-full bg-[#AEAC78] mr-1" />
                    <Text className="text-[9px] font-poppins-bold text-[#2d3416]">
                      {item.status || "OPERATIONAL"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Splitter Port Matrix (Interactive Technician Drop Cable Activation) */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-4 mb-3.5 shadow-xs">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5 shrink-0">
                  <MaterialCommunityIcons
                    name="lan"
                    size={16}
                    color="#4d6029"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[13px] font-poppins-bold text-[#0f172a]"
                    numberOfLines={1}
                  >
                    Port Allocation
                  </Text>
                  <Text
                    className="text-[10px] font-poppins text-[#64748b]"
                    numberOfLines={1}
                  >
                    Tap empty port to assign drop wire
                  </Text>
                </View>
              </View>
              <View className="bg-[#4d6029]/10 border border-[#4d6029]/20 px-2.5 py-0.5 rounded-full shrink-0">
                <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                  {portsOccupied} / {box.totalPorts} Assigned
                </Text>
              </View>
            </View>

            {/* Interactive Port Legend */}
            <View className="flex-row items-center flex-wrap gap-x-4 gap-y-1.5 mb-3 px-0.5">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-[#4d6029] mr-1.5" />
                <Text className="text-[10px] font-poppins-medium text-[#475569]">
                  Occupied (Tap to Inspect)
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 mr-1.5" />
                <Text className="text-[10px] font-poppins-medium text-[#475569]">
                  Available (Tap to Assign)
                </Text>
              </View>
            </View>

            <View className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 gap-2">
              {portRows.map((rowPorts, rIdx) => (
                <View key={`port-row-${rIdx}`} className="flex-row gap-2">
                  {rowPorts.map((portNum, cIdx) => {
                    if (portNum === null) {
                      return (
                        <View
                          key={`empty-slot-${rIdx}-${cIdx}`}
                          className="flex-1 h-12"
                        />
                      );
                    }

                    const clientOnPort = (box.clients || []).find(
                      (c) =>
                        c.portNumber === portNum ||
                        c.port === `Port ${portNum}` ||
                        c.port === `Port 0${portNum}` ||
                        parseInt(
                          String(c.port || "").replace(/\D/g, ""),
                          10
                        ) === portNum
                    );
                    const hasExplicitClients =
                      Array.isArray(box.clients) && box.clients.length > 0;
                    const isOccupied = hasExplicitClients
                      ? Boolean(clientOnPort)
                      : portNum <= portsOccupied;
                    const isSuspended =
                      clientOnPort?.status === "DISCONNECTED";

                    return (
                      <TouchableOpacity
                        key={portNum}
                        onPress={() =>
                          handleTapPortTile(
                            portNum,
                            isOccupied
                              ? clientOnPort || {
                                  port: `Port ${portNum}`,
                                  portNumber: portNum,
                                  accountNumber: `26080000${String(
                                    portNum
                                  ).padStart(2, "0")}`,
                                  name: `Assigned Subscriber (P${portNum})`,
                                  clientType: "Residential",
                                  plan: "100 Mbps Fiber Plan",
                                  status: "CONNECTED",
                                }
                              : null
                          )
                        }
                        activeOpacity={0.75}
                        className={`flex-1 h-12 rounded-2xl items-center justify-center border ${
                          isOccupied
                            ? isSuspended
                              ? "bg-amber-600 border-amber-700 shadow-xs"
                              : "bg-[#4d6029] border-[#3e4e20] shadow-xs"
                            : "bg-white border-slate-200 shadow-xs"
                        }`}
                      >
                        <Ionicons
                          name={
                            isOccupied ? "hardware-chip" : "add-circle-outline"
                          }
                          size={14}
                          color={isOccupied ? "#ffffff" : "#64748b"}
                        />
                        <Text
                          className={`text-[9px] font-poppins-bold mt-0.5 ${
                            isOccupied ? "text-white" : "text-[#64748b]"
                          }`}
                        >
                          P{portNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Connected Subscribers / Clients */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-4 mb-5 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5 shrink-0">
                  <Ionicons name="people" size={16} color="#4d6029" />
                </View>
                <Text
                  className="text-[13px] font-poppins-bold text-[#0f172a] flex-1"
                  numberOfLines={1}
                >
                  Client Connected
                </Text>
              </View>
              <Text className="text-xs font-poppins text-[#64748b] shrink-0">
                {box.clients?.length || 0} Registered
              </Text>
            </View>

            {!box.clients || box.clients.length === 0 ? (
              <View className="bg-slate-50 p-5 rounded-2xl border border-slate-100 items-center justify-center">
                <Ionicons name="people-outline" size={28} color="#94a3b8" />
                <Text className="text-xs font-poppins-bold text-slate-700 mt-2">
                  No Active Subscribers
                </Text>
                <Text className="text-[11px] font-poppins text-slate-400 text-center mt-0.5">
                  Tap any empty port above (e.g. P1) to assign a drop wire from
                  pending work orders.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {box.clients.map((sub, idx) => {
                  const resolvedPortNum =
                    sub.portNumber ||
                    parseInt(String(sub.port || "").replace(/[^0-9]/g, ""), 10) ||
                    idx + 1;
                  const isSubDisconnected = sub.status === "DISCONNECTED";
                  return (
                    <TouchableOpacity
                      key={sub.id || idx}
                      onPress={() => handleTapPortTile(resolvedPortNum, sub)}
                      activeOpacity={0.8}
                      className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View
                          className={`w-8 h-8 rounded-xl items-center justify-center mr-2.5 shrink-0 ${
                            isSubDisconnected ? "bg-amber-600" : "bg-[#4d6029]"
                          }`}
                        >
                          <Text className="text-[10px] font-poppins-bold text-white">
                            P{resolvedPortNum}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center flex-wrap">
                            <Text
                              className="text-xs font-poppins-bold text-[#0f172a] mr-1.5"
                              numberOfLines={1}
                            >
                              {sub.name}
                            </Text>
                            {sub.clientType && (
                              <View
                                className={`px-1.5 py-0.2 rounded border ${
                                  sub.clientType
                                    .toUpperCase()
                                    .includes("COMMERCIAL")
                                    ? "bg-blue-50 border-blue-200"
                                    : "bg-emerald-50 border-emerald-200"
                                }`}
                              >
                                <Text
                                  className={`text-[8px] font-poppins-bold ${
                                    sub.clientType
                                      .toUpperCase()
                                      .includes("COMMERCIAL")
                                      ? "text-blue-700"
                                      : "text-emerald-700"
                                  }`}
                                >
                                  {sub.clientType
                                    .toUpperCase()
                                    .includes("COMMERCIAL")
                                    ? "Commercial"
                                    : "Residential"}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            className="text-[10px] font-poppins text-[#64748b] mt-0.5"
                            numberOfLines={1}
                          >
                            {sub.accountNumber} · {sub.plan || "Standard Fiber"}
                          </Text>
                        </View>
                      </View>

                      <View
                        className={`px-2 py-0.5 rounded-lg flex-row items-center border shrink-0 ${
                          isSubDisconnected
                            ? "bg-amber-50 border-amber-300"
                            : "bg-[#AEAC78]/25 border-[#AEAC78]/80"
                        }`}
                      >
                        <View
                          className={`w-1.5 h-1.5 rounded-full mr-1 ${
                            isSubDisconnected ? "bg-amber-500" : "bg-[#AEAC78]"
                          }`}
                        />
                        <Text
                          className={`text-[9px] font-poppins-bold ${
                            isSubDisconnected ? "text-amber-800" : "text-[#2d3416]"
                          }`}
                        >
                          {sub.status || "CONNECTED"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 7. Field Audit Inspection Modal */}
      {isAuditModalOpen && (
        <Modal
          visible={isAuditModalOpen}
          transparent
          statusBarTranslucent
          animationType="fade"
          onRequestClose={() => {
            if (showConfirmSubmitModal) {
              setShowConfirmSubmitModal(false);
            } else {
              setIsAuditModalOpen(false);
            }
          }}
        >
          <View className="flex-1 bg-black/75 items-center justify-center p-4 relative">
            <View className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color="#4d6029"
                    />
                  </View>
                  <Text className="text-base font-poppins-bold text-[#0f172a]">
                    Inspect {box.code}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAuditModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 active:opacity-70"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <View className="space-y-3">
                {/* Physical Padlock Verification Toggle */}
                <TouchableOpacity
                  onPress={handleTogglePadlock}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    backgroundColor: padlockVerified
                      ? "rgba(174, 172, 120, 0.2)"
                      : "rgba(255, 241, 242, 0.9)",
                    borderColor: padlockVerified
                      ? "rgba(174, 172, 120, 0.7)"
                      : "#fecdd3",
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                    <Ionicons
                      name={padlockVerified ? "lock-closed" : "lock-open"}
                      size={18}
                      color={padlockVerified ? "#4d6029" : "#dc2626"}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0f172a" }}>
                        Cabinet Padlock & Seal
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: "Poppins_400Regular", color: "#64748b" }}>
                        {padlockVerified
                          ? "Physical lock latched and intact"
                          : "Lock unlatched or seal broken"}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: padlockVerified
                        ? "rgba(174, 172, 120, 0.3)"
                        : "#ffe4e6",
                      borderColor: padlockVerified
                        ? "rgba(174, 172, 120, 0.8)"
                        : "#fca5a5",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Poppins_700Bold",
                        color: padlockVerified ? "#4d6029" : "#9f1239",
                      }}
                    >
                      {padlockVerified ? "VERIFIED" : "ISSUE"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Status Selection */}
                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Poppins_600SemiBold",
                      color: "#475569",
                      marginBottom: 6,
                    }}
                  >
                    Box Operational Status:
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(["ACTIVE", "NEEDS_TAG", "ISSUE"] as const).map((st) => {
                      const isSelected = auditStatus === st;
                      const activeBg =
                        st === "ACTIVE"
                          ? "#4d6029"
                          : st === "NEEDS_TAG"
                            ? "#d97706"
                            : "#dc2626";
                      const activeBorder =
                        st === "ACTIVE"
                          ? "#3e4e20"
                          : st === "NEEDS_TAG"
                            ? "#b45309"
                            : "#b91c1c";

                      return (
                        <TouchableOpacity
                          key={st}
                          onPress={() => handleSelectStatus(st)}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 12,
                            alignItems: "center",
                            borderWidth: 1,
                            backgroundColor: isSelected ? activeBg : "#f1f5f9",
                            borderColor: isSelected ? activeBorder : "#e2e8f0",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontFamily: "Poppins_700Bold",
                              color: isSelected ? "#ffffff" : "#475569",
                            }}
                          >
                            {st === "ACTIVE"
                              ? "Active"
                              : st === "NEEDS_TAG"
                                ? "Needs Tag"
                                : "Issue"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Hardware Issue Selection Chips or Operational Confirmation */}
                {auditStatus === "ISSUE" ? (
                  <View
                    style={{
                      marginBottom: 12,
                      backgroundColor: "rgba(255, 241, 242, 0.7)",
                      borderColor: "rgba(254, 205, 211, 0.9)",
                      borderWidth: 1,
                      borderRadius: 16,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Poppins_700Bold",
                        color: "#881337",
                        marginBottom: 8,
                      }}
                    >
                      Select Problem Type:
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                      }}
                    >
                      {[
                        {
                          id: "Cable Damage / Cut",
                          icon: "flash-outline",
                          label: "Cable Cut / Damage",
                        },
                        {
                          id: "Defective Port / Splitter",
                          icon: "hardware-chip-outline",
                          label: "Defective Splitter / Port",
                        },
                        {
                          id: "Broken Lock / Door",
                          icon: "lock-open-outline",
                          label: "Broken Lock / Door",
                        },
                        {
                          id: "Water / Weather Damage",
                          icon: "rainy-outline",
                          label: "Water / Weather Damage",
                        },
                      ].map((issue) => {
                        const isSelected = selectedIssueType === issue.id;
                        return (
                          <TouchableOpacity
                            key={issue.id}
                            onPress={() => handleSelectIssueType(issue.id)}
                            activeOpacity={0.8}
                            style={{
                              width: "48.5%",
                              marginBottom: 8,
                              paddingVertical: 8,
                              paddingHorizontal: 10,
                              borderRadius: 12,
                              borderWidth: 1,
                              flexDirection: "row",
                              alignItems: "center",
                              minHeight: 44,
                              backgroundColor: isSelected ? "#dc2626" : "#ffffff",
                              borderColor: isSelected ? "#b91c1c" : "#fecdd3",
                            }}
                          >
                            <Ionicons
                              name={issue.icon as any}
                              size={14}
                              color={isSelected ? "#ffffff" : "#dc2626"}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 10,
                                lineHeight: 13,
                                fontFamily: "Poppins_700Bold",
                                flex: 1,
                                color: isSelected ? "#ffffff" : "#881337",
                              }}
                            >
                              {issue.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      marginBottom: 12,
                      backgroundColor: "rgba(174, 172, 120, 0.2)",
                      borderColor: "rgba(174, 172, 120, 0.7)",
                      borderWidth: 1,
                      borderRadius: 16,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#4d6029"
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Poppins_400Regular",
                        color: "#4d6029",
                        marginLeft: 8,
                        flex: 1,
                      }}
                    >
                      All optical ports, enclosure, and hardware verified operational on-site.
                    </Text>
                  </View>
                )}

                {/* Audit Notes Input */}
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Poppins_600SemiBold",
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    Field Inspection Notes:
                  </Text>
                  <TextInput
                    placeholder={
                      auditStatus === "ISSUE"
                        ? "Describe specific damage (e.g. Port 4 connector cracked)..."
                        : "Optional notes on cabinet condition, maintenance performed..."
                    }
                    placeholderTextColor="#94a3b8"
                    value={auditNotes}
                    onChangeText={setAuditNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{
                      backgroundColor: "#f8fafc",
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      borderRadius: 16,
                      padding: 12,
                      fontSize: 12,
                      fontFamily: "Poppins_400Regular",
                      color: "#0f172a",
                      height: 80,
                    }}
                  />
                </View>
              </View>

              {/* Submit / Cancel Buttons */}
              <View className="flex-row pt-4 mt-4 border-t border-slate-100 gap-2">
                <TouchableOpacity
                  onPress={() => setShowConfirmSubmitModal(true)}
                  disabled={isSubmittingAudit}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row shadow-xs active:opacity-85"
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#ffffff"
                  />
                  <Text className="text-white text-xs font-poppins-bold ml-1.5">
                    Submit Inspection Report
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowConfirmSubmitModal(false);
                    setIsAuditModalOpen(false);
                  }}
                  disabled={isSubmittingAudit}
                  className="px-4 py-3 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-[#475569] text-xs font-poppins-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Customized Submit Confirmation Modal Overlay */}
            {showConfirmSubmitModal && (
              <View className="absolute inset-0 bg-black/60 items-center justify-center p-4 z-50">
                <View className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 items-center">
                  {/* Status Badge Icon */}
                  <View
                    className={`w-14 h-14 rounded-2xl items-center justify-center mb-3.5 border ${
                      auditStatus === "ISSUE"
                        ? "bg-rose-50 border-rose-200"
                        : auditStatus === "NEEDS_TAG"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-[#AEAC78]/25 border-[#AEAC78]/70"
                    }`}
                  >
                    <Ionicons
                      name={
                        auditStatus === "ISSUE"
                          ? "alert-circle"
                          : auditStatus === "NEEDS_TAG"
                            ? "pricetag"
                            : "shield-checkmark"
                      }
                      size={28}
                      color={
                        auditStatus === "ISSUE"
                          ? "#dc2626"
                          : auditStatus === "NEEDS_TAG"
                            ? "#d97706"
                            : "#4d6029"
                      }
                    />
                  </View>

                  {/* Header Title & Subtitle */}
                  <Text className="text-base font-poppins-bold text-[#0f172a] text-center">
                    Submit Field Inspection
                  </Text>
                  <Text className="text-xs font-poppins text-[#64748b] text-center mt-1 mb-4 leading-relaxed">
                    Confirm inspection submission for{" "}
                    <Text className="font-mono font-bold text-[#0f172a]">
                      {box.code}
                    </Text>
                    ?
                  </Text>

                  {/* Summary Card */}
                  <View className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-5 space-y-2.5">
                    {/* Status */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                        Reported Status:
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-lg border ${
                          auditStatus === "ACTIVE"
                            ? "bg-[#AEAC78]/30 border-[#AEAC78]/80"
                            : auditStatus === "NEEDS_TAG"
                              ? "bg-amber-100 border-amber-300"
                              : "bg-rose-100 border-rose-300"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-poppins-bold ${
                            auditStatus === "ACTIVE"
                              ? "text-[#4d6029]"
                              : auditStatus === "NEEDS_TAG"
                                ? "text-amber-800"
                                : "text-rose-800"
                          }`}
                        >
                          {auditStatus === "ACTIVE"
                            ? "Active & Verified"
                            : auditStatus === "NEEDS_TAG"
                              ? "Needs Tag"
                              : "Issue Reported"}
                        </Text>
                      </View>
                    </View>

                    {/* Problem Type if ISSUE */}
                    {auditStatus === "ISSUE" && (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                          Problem Type:
                        </Text>
                        <Text
                          className="text-[11px] font-poppins-bold text-rose-700 max-w-[55%] text-right"
                          numberOfLines={1}
                        >
                          {selectedIssueType}
                        </Text>
                      </View>
                    )}

                    {/* Padlock */}
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                        Cabinet Padlock:
                      </Text>
                      <View className="flex-row items-center">
                        <Ionicons
                          name={padlockVerified ? "checkmark-circle" : "close-circle"}
                          size={13}
                          color={padlockVerified ? "#4d6029" : "#dc2626"}
                          style={{ marginRight: 3 }}
                        />
                        <Text
                          className={`text-[11px] font-poppins-bold ${
                            padlockVerified ? "text-[#4d6029]" : "text-rose-700"
                          }`}
                        >
                          {padlockVerified ? "Verified Intact" : "Unlatched / Broken"}
                        </Text>
                      </View>
                    </View>

                    {/* Notes preview if entered */}
                    {auditNotes.trim().length > 0 && (
                      <View className="pt-2 border-t border-slate-200/60">
                        <Text className="text-[10px] font-poppins-medium text-[#64748b] mb-0.5">
                          Inspection Notes:
                        </Text>
                        <Text
                          numberOfLines={2}
                          className="text-[11px] font-poppins text-[#334155] italic bg-white p-2 rounded-xl border border-slate-200/60"
                        >
                          &ldquo;{auditNotes.trim()}&rdquo;
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View className="flex-row gap-2.5 w-full">
                    <TouchableOpacity
                      onPress={() => setShowConfirmSubmitModal(false)}
                      disabled={isSubmittingAudit}
                      className="flex-1 bg-slate-100 py-3 rounded-xl items-center justify-center active:opacity-80"
                    >
                      <Text className="text-xs font-poppins-bold text-[#475569]">
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSubmitAudit}
                      disabled={isSubmittingAudit}
                      className={`flex-1 py-3 rounded-xl items-center justify-center flex-row shadow-sm active:opacity-90 ${
                        auditStatus === "ISSUE" ? "bg-rose-600" : "bg-[#4d6029]"
                      }`}
                    >
                      {isSubmittingAudit ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#ffffff"
                          />
                          <Text className="text-white text-xs font-poppins-bold ml-1.5">
                            Submit
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Modal>
      )}

      {/* 8. Assign Drop Wire Modal (Technician Drop Cable Activation on Empty Port) */}
      {isAssignPortModalOpen && selectedPortNumber !== null && (
        <Modal
          visible={isAssignPortModalOpen}
          transparent
          statusBarTranslucent
          animationType="fade"
          onRequestClose={() => setIsAssignPortModalOpen(false)}
        >
          <View className="flex-1 bg-black/75 items-center justify-center p-4">
            <View className="bg-white rounded-3xl p-4 max-w-lg w-full max-h-[88%] shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-2xl bg-[#4d6029] items-center justify-center mr-2.5 shadow-xs shrink-0">
                    <Text className="text-xs font-poppins-bold text-white">
                      P{selectedPortNumber}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-[15px] font-poppins-bold text-[#0f172a]"
                      numberOfLines={1}
                    >
                      Assign Drop Wire · Port P{selectedPortNumber}
                    </Text>
                    <Text
                      className="text-[11px] font-poppins text-[#64748b]"
                      numberOfLines={2}
                    >
                      Select pending installation work order or enter subscriber
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAssignPortModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 shrink-0 active:opacity-70"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Step 1: Pending Installation Work Orders */}
                <View className="mb-3.5">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Ionicons
                        name="clipboard-outline"
                        size={14}
                        color="#4d6029"
                      />
                      <Text
                        className="text-xs font-poppins-bold text-[#0f172a] ml-1.5 flex-1"
                        numberOfLines={1}
                      >
                        Pending Installation Work Orders
                      </Text>
                    </View>
                    <View className="bg-[#4d6029]/10 px-2 py-0.5 rounded-full shrink-0">
                      <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                        {pendingWorkOrders.length} Ready
                      </Text>
                    </View>
                  </View>

                  {/* Search Pending Work Orders */}
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 mb-2">
                    <Ionicons name="search" size={14} color="#64748b" />
                    <TextInput
                      placeholder="Search work order name, account #, or address..."
                      placeholderTextColor="#94a3b8"
                      value={workOrderSearch}
                      onChangeText={setWorkOrderSearch}
                      className="flex-1 ml-2 text-xs font-poppins text-[#0f172a] py-0.5"
                    />
                    {workOrderSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setWorkOrderSearch("")}>
                        <Ionicons
                          name="close-circle"
                          size={14}
                          color="#94a3b8"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Work Orders List */}
                  {loadingWorkOrders ? (
                    <View className="py-4 items-center justify-center bg-slate-50 rounded-2xl border border-slate-200/80">
                      <ActivityIndicator size="small" color="#4d6029" />
                      <Text className="text-[11px] font-poppins text-[#64748b] mt-1.5">
                        Loading pending work orders...
                      </Text>
                    </View>
                  ) : (
                    <View className="max-h-44 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-2">
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                      >
                        {pendingWorkOrders
                          .filter((wo) => {
                            if (!workOrderSearch.trim()) return true;
                            const q = workOrderSearch.toLowerCase().trim();
                            return (
                              (wo.customerName || wo.name || "")
                                .toLowerCase()
                                .includes(q) ||
                              String(wo.accountNumber)
                                .toLowerCase()
                                .includes(q) ||
                              (wo.address || "").toLowerCase().includes(q) ||
                              (wo.servicePlan || wo.plan || "")
                                .toLowerCase()
                                .includes(q)
                            );
                          })
                          .map((wo, idx) => {
                            const isSelected =
                              selectedWorkOrderAcc ===
                              String(wo.accountNumber).trim();
                            const woType = (
                              wo.subscriberType ||
                              wo.category ||
                              "Residential"
                            ).toUpperCase();
                            const isCommercial = woType.includes("COMMERCIAL");

                            return (
                              <TouchableOpacity
                                key={wo.accountNumber || idx}
                                onPress={() => handleSelectWorkOrder(wo)}
                                activeOpacity={0.8}
                                className={`p-2.5 rounded-xl mb-1.5 border flex-row items-center justify-between ${
                                  isSelected
                                    ? "bg-[#4d6029]/12 border-[#4d6029]"
                                    : "bg-white border-slate-200/90"
                                }`}
                              >
                                <View className="flex-1 mr-2">
                                  <View className="flex-row items-center flex-wrap">
                                    <Text
                                      className="text-xs font-poppins-bold text-[#0f172a] mr-1.5"
                                      numberOfLines={1}
                                    >
                                      {wo.customerName || wo.name}
                                    </Text>
                                    <View
                                      className={`px-1.5 py-0.2 rounded border ${
                                        isCommercial
                                          ? "bg-blue-50 border-blue-200"
                                          : "bg-emerald-50 border-emerald-200"
                                      }`}
                                    >
                                      <Text
                                        className={`text-[8px] font-poppins-bold ${
                                          isCommercial
                                            ? "text-blue-700"
                                            : "text-emerald-700"
                                        }`}
                                      >
                                        {isCommercial
                                          ? "Commercial"
                                          : "Residential"}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text
                                    className="text-[10px] font-poppins text-[#475569] mt-0.5"
                                    numberOfLines={1}
                                  >
                                    WO #{wo.accountNumber} ·{" "}
                                    {wo.servicePlan || wo.plan}
                                  </Text>
                                  {wo.address ? (
                                    <Text
                                      className="text-[9px] font-poppins text-[#64748b] mt-0.5"
                                      numberOfLines={1}
                                    >
                                      {wo.address}
                                    </Text>
                                  ) : null}
                                </View>
                                <Ionicons
                                  name={
                                    isSelected
                                      ? "checkmark-circle"
                                      : "ellipse-outline"
                                  }
                                  size={18}
                                  color={isSelected ? "#4d6029" : "#cbd5e1"}
                                />
                              </TouchableOpacity>
                            );
                          })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Step 2: Subscriber & Drop Wire Details */}
                <View className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-[11px] font-poppins-bold text-[#0f172a] flex-1 mr-2"
                      numberOfLines={1}
                    >
                      Subscriber Drop Cable Details
                    </Text>
                    <TouchableOpacity
                      onPress={handleGenerateAccountNumber}
                      className="flex-row items-center bg-[#4d6029]/10 px-2 py-0.5 rounded-lg border border-[#4d6029]/25 shrink-0"
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={11}
                        color="#4d6029"
                      />
                      <Text className="text-[9px] font-poppins-bold text-[#4d6029] ml-1">
                        Generate Acc #
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Account Number */}
                  <View>
                    <Text className="text-[10px] font-poppins-semibold text-[#475569] mb-1">
                      Account / Work Order Number
                    </Text>
                    <TextInput
                      placeholder="10-digit account number (e.g. 2608001018)"
                      placeholderTextColor="#94a3b8"
                      value={assignAccountNumber}
                      onChangeText={(val) => {
                        setAssignAccountNumber(
                          val.replace(/\D/g, "").slice(0, 10)
                        );
                        setSelectedWorkOrderAcc(null);
                      }}
                      keyboardType="numeric"
                      maxLength={10}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-poppins-medium text-[#0f172a]"
                    />
                  </View>

                  {/* Subscriber Name */}
                  <View className="mt-2">
                    <Text className="text-[10px] font-poppins-semibold text-[#475569] mb-1">
                      Subscriber / Business Name
                    </Text>
                    <TextInput
                      placeholder="Full customer or business name"
                      placeholderTextColor="#94a3b8"
                      value={assignSubscriberName}
                      onChangeText={setAssignSubscriberName}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-poppins-medium text-[#0f172a]"
                    />
                  </View>

                  {/* Subscriber Type */}
                  <View className="mt-2">
                    <Text className="text-[10px] font-poppins-semibold text-[#475569] mb-1">
                      Subscriber Classification
                    </Text>
                    <View className="flex-row gap-2">
                      {(["Residential", "Commercial"] as const).map((type) => {
                        const active = assignSubscriberType === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setAssignSubscriberType(type)}
                            className={`flex-1 py-2 rounded-xl items-center border ${
                              active
                                ? "bg-[#4d6029] border-[#3e4e20]"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <Text
                              className={`text-[11px] font-poppins-bold ${
                                active ? "text-white" : "text-[#475569]"
                              }`}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Service Plan Chips */}
                  <View className="mt-2">
                    <Text className="text-[10px] font-poppins-semibold text-[#475569] mb-1">
                      Subscribed Fiber Plan
                    </Text>
                    <View className="flex-row gap-1.5">
                      {FIBER_PLAN_OPTIONS.map((planOption) => {
                        const active = assignServicePlan === planOption;
                        return (
                          <TouchableOpacity
                            key={planOption}
                            onPress={() => setAssignServicePlan(planOption)}
                            className={`flex-1 py-1.5 rounded-xl items-center justify-center border ${
                              active
                                ? "bg-[#4d6029] border-[#3e4e20]"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-poppins-bold ${
                                active ? "text-white" : "text-[#475569]"
                              }`}
                              numberOfLines={1}
                            >
                              {planOption.replace(" Fiber Plan", "")}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer Buttons */}
              <View className="flex-row pt-3.5 mt-3 border-t border-slate-100 gap-2">
                <TouchableOpacity
                  onPress={handleConfirmAssignDropWire}
                  disabled={isSubmittingPortAction}
                  className="flex-1 bg-[#4d6029] py-3 px-2 rounded-xl items-center justify-center flex-row shadow-xs active:opacity-85"
                >
                  {isSubmittingPortAction ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={15} color="#ffffff" />
                      <Text
                        className="text-white text-xs font-poppins-bold ml-1.5"
                        numberOfLines={1}
                      >
                        Assign Drop Wire & Activate P{selectedPortNumber}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsAssignPortModalOpen(false)}
                  disabled={isSubmittingPortAction}
                  className="px-4 py-3 bg-slate-100 rounded-xl items-center justify-center shrink-0"
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

      {/* 9. Port Subscriber Inspector Modal (Occupied Port Details & Actions) */}
      {isPortInspectorModalOpen &&
        selectedPortNumber !== null &&
        selectedPortClient && (
          <Modal
            visible={isPortInspectorModalOpen}
            transparent
            statusBarTranslucent
            animationType="fade"
            onRequestClose={() => {
              setShowConfirmReleasePort(false);
              setIsPortInspectorModalOpen(false);
            }}
          >
            <View className="flex-1 bg-black/75 items-center justify-center p-4">
              <View className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-100">
                {/* Header */}
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 shrink-0 ${
                        selectedPortClient.status === "DISCONNECTED"
                          ? "bg-amber-600"
                          : "bg-[#4d6029]"
                      }`}
                    >
                      <Text className="text-xs font-poppins-bold text-white">
                        P{selectedPortNumber}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-base font-poppins-bold text-[#0f172a]"
                        numberOfLines={1}
                      >
                        Port P{selectedPortNumber} · Occupied
                      </Text>
                      <Text
                        className="text-[11px] font-poppins text-[#64748b]"
                        numberOfLines={1}
                      >
                        {box.code} · Active Drop Cable Assignment
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowConfirmReleasePort(false);
                      setIsPortInspectorModalOpen(false);
                    }}
                    className="p-1.5 rounded-full bg-slate-100 shrink-0 active:opacity-70"
                  >
                    <Ionicons name="close" size={18} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Subscriber Details Card */}
                <View className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4 space-y-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-poppins text-[#64748b]">
                      Port Status
                    </Text>
                    <View
                      className={`px-2.5 py-0.5 rounded-lg border flex-row items-center ${
                        selectedPortClient.status === "DISCONNECTED"
                          ? "bg-amber-100 border-amber-300"
                          : "bg-[#AEAC78]/30 border-[#AEAC78]/90"
                      }`}
                    >
                      <View
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          selectedPortClient.status === "DISCONNECTED"
                            ? "bg-amber-600"
                            : "bg-[#4d6029]"
                        }`}
                      />
                      <Text
                        className={`text-[10px] font-poppins-bold ${
                          selectedPortClient.status === "DISCONNECTED"
                            ? "text-amber-800"
                            : "text-[#2d3416]"
                        }`}
                      >
                        {selectedPortClient.status || "CONNECTED"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-200/60">
                    <Text className="text-[11px] font-poppins text-[#64748b]">
                      Subscriber Name
                    </Text>
                    <Text
                      className="text-xs font-poppins-bold text-[#0f172a] max-w-[60%] text-right"
                      numberOfLines={1}
                    >
                      {selectedPortClient.name}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-200/60">
                    <Text className="text-[11px] font-poppins text-[#64748b]">
                      Account Number
                    </Text>
                    <Text className="text-xs font-mono font-bold text-[#0f172a]">
                      {selectedPortClient.accountNumber}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-200/60">
                    <Text className="text-[11px] font-poppins text-[#64748b]">
                      Classification
                    </Text>
                    <Text className="text-xs font-poppins-semibold text-[#334155]">
                      {selectedPortClient.clientType || "Residential"}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-200/60">
                    <Text className="text-[11px] font-poppins text-[#64748b]">
                      Fiber Service Plan
                    </Text>
                    <Text className="text-xs font-poppins-bold text-[#4d6029]">
                      {selectedPortClient.plan || "100 Mbps Fiber Plan"}
                    </Text>
                  </View>
                </View>

                {/* Port Lock Notice */}
                <View className="bg-[#AEAC78]/20 border border-[#AEAC78]/60 rounded-2xl p-3 mb-4 flex-row items-center">
                  <Ionicons name="lock-closed" size={16} color="#4d6029" />
                  <Text className="text-[10px] font-poppins text-[#2d3416] ml-2 flex-1">
                    Port P{selectedPortNumber} is locked to prevent duplicate
                    field drop-wire patching.
                  </Text>
                </View>

                {showConfirmReleasePort ? (
                  <View className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-2">
                    <Text className="text-xs font-poppins-bold text-rose-900 mb-1">
                      Disconnect & Release Port P{selectedPortNumber}?
                    </Text>
                    <Text className="text-[11px] font-poppins text-rose-700 mb-3">
                      This will unassign {selectedPortClient.name} from Port P
                      {selectedPortNumber} and make the port available again.
                    </Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => setShowConfirmReleasePort(false)}
                        disabled={isSubmittingPortAction}
                        className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl items-center"
                      >
                        <Text className="text-xs font-poppins-bold text-[#475569]">
                          Keep Assigned
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleReleasePort}
                        disabled={isSubmittingPortAction}
                        className="flex-1 py-2.5 bg-rose-600 rounded-xl items-center justify-center flex-row"
                      >
                        {isSubmittingPortAction ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text className="text-xs font-poppins-bold text-white">
                            Confirm Release
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="gap-2">
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={handleTogglePortStatus}
                        disabled={isSubmittingPortAction}
                        className="flex-1 py-2.5 bg-slate-100 border border-slate-200 rounded-xl items-center justify-center flex-row"
                      >
                        <Ionicons
                          name={
                            selectedPortClient.status === "DISCONNECTED"
                              ? "flash-outline"
                              : "pause-circle-outline"
                          }
                          size={15}
                          color="#334155"
                        />
                        <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                          {selectedPortClient.status === "DISCONNECTED"
                            ? "Reconnect Port"
                            : "Suspend Port"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setShowConfirmReleasePort(true)}
                        disabled={isSubmittingPortAction}
                        className="flex-1 py-2.5 bg-rose-50 border border-rose-200 rounded-xl items-center justify-center flex-row"
                      >
                        <Ionicons
                          name="unlink-outline"
                          size={15}
                          color="#dc2626"
                        />
                        <Text className="text-xs font-poppins-bold text-rose-700 ml-1.5">
                          Release Port
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => setIsPortInspectorModalOpen(false)}
                      className="w-full py-2.5 bg-[#4d6029] rounded-xl items-center justify-center mt-1"
                    >
                      <Text className="text-xs font-poppins-bold text-white">
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
    </View>
  );
}
