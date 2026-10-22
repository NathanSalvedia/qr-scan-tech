import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
  latestIssue?: {
    notes: string;
    reportedBy?: string;
    reportedAt?: string;
    padlockVerified?: boolean;
    issueType?: string;
  } | null;
}

export default function BoxDetailsScreen() {
  const params = useLocalSearchParams<{ code?: string; id?: string }>();
  const boxIdentifier = (params.id || params.code || "DB-MN-01").trim();

  // Dynamic box state
  const [box, setBox] = useState<BoxDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field audit modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [auditNotes, setAuditNotes] = useState("");
  const [padlockVerified, setPadlockVerified] = useState(true);
  const [auditStatus, setAuditStatus] = useState<string>("ACTIVE");
  const [selectedIssueType, setSelectedIssueType] = useState<string>(
    "Defective Port / Splitter"
  );

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const isWeb = Platform.OS === "web";

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
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
    setAuditStatus(box.status || "ACTIVE");
    setPadlockVerified(true);
    setSelectedIssueType("Defective Port / Splitter");
    setAuditNotes("");
    setIsAuditModalOpen(true);
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

      const res = await logsService.recordScan({
        boxId: box.id,
        boxCode: box.code,
        scanType: "ROUTINE_AUDIT",
        padlockVerified,
        auditNotes: fullNotes,
        boxStatusAtScan: auditStatus,
      });

      if (res.success) {
        if (auditStatus !== box.status) {
          await boxService.update(box.id, { status: auditStatus });
        }
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

  const displayEquipment = getDisplayEquipment(box);
  const statusInfo = getStatusBadge(box.status);
  const portsOccupied =
    box.portsUsed ?? box.activePorts ?? (box.clients ? box.clients.length : 0);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#f8fafc]">
      <StatusBar style="light" />

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

      {/* Main Top Header Banner */}
      <View className="bg-[#4d6029] px-5 py-3.5 flex-row items-center justify-between shadow-md">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleGoBack}
            className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-3 active:bg-white/30"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </TouchableOpacity>

          {/* Box Brand Icon */}
          <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mr-3 border border-white/30">
            <MaterialCommunityIcons
              name="cube-outline"
              size={22}
              color="#ffffff"
            />
          </View>

          {/* Box Header Info */}
          <View className="flex-1">
            <Text
              className="text-base font-poppins-bold text-white"
              numberOfLines={1}
            >
              {box.code}
            </Text>
            <Text
              className="text-[11px] font-poppins text-white/80"
              numberOfLines={1}
            >
              {box.siteName}
            </Text>
          </View>
        </View>

        {/* Header Action Buttons */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleOpenAuditModal}
            className="bg-white/25 border border-white/30 px-3 py-1.5 rounded-xl flex-row items-center active:bg-white/35"
          >
            <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
            <Text className="text-[11px] font-poppins-bold text-white ml-1.5">
              Inspect
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Page Body */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 50 }}
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
          {/* Active Hardware Issue Alert Banner */}
          {box.status === "ISSUE" && (
            <View className="bg-rose-50 border border-rose-200/90 rounded-3xl p-4 mb-4 shadow-xs">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-xl bg-rose-500/15 items-center justify-center mr-2.5">
                    <Ionicons name="warning" size={17} color="#dc2626" />
                  </View>
                  <Text className="text-xs font-poppins-bold text-rose-900">
                    Active Hardware Issue Reported
                  </Text>
                </View>
                <View className="bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg">
                  <Text className="text-[9px] font-poppins-bold text-rose-800">
                    NEEDS REPAIR
                  </Text>
                </View>
              </View>
              <Text className="text-xs font-poppins text-rose-800 ml-10">
                {box.latestIssue?.notes ||
                  box.notes ||
                  "Hardware problem or physical degradation reported. Inspection and repair required."}
              </Text>
              {box.latestIssue?.reportedBy && (
                <Text className="text-[10px] font-poppins text-rose-500 ml-10 mt-1">
                  Reported by {box.latestIssue.reportedBy} · {box.latestIssue.reportedAt}
                </Text>
              )}
            </View>
          )}

          {/* 1. Classification & Hierarchy Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <View
                  className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${
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
                  <Text className="text-sm font-poppins-bold text-[#0f172a]">
                    {box.category === "MAIN_BOX"
                      ? "Main Distribution Box"
                      : "Sub-Distribution Box"}
                  </Text>
                </View>
              </View>

              {/* Status Pill */}
              <View
                className={`px-2.5 py-1 rounded-xl flex-row items-center border ${statusInfo.bg} ${statusInfo.border}`}
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
            {box.category === "SUB_BOX" && (
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
                <View className="bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-xl">
                  <Text className="text-xs font-mono font-bold text-[#0f172a]">
                    {box.parentCode || "DB-MN-01"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 2. Location & GIS Coordinates Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-xs">
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3 mt-0.5">
                <Ionicons name="location" size={18} color="#4d6029" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-poppins-bold text-[#0f172a]">
                  {box.siteName}
                </Text>
                <Text className="text-xs font-poppins text-[#64748b] mt-0.5">
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
          </View>

          {/* 3. Hardware Equipment Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <MaterialCommunityIcons
                    name="tools"
                    size={16}
                    color="#4d6029"
                  />
                </View>
                <Text className="text-sm font-poppins-bold text-[#0f172a]">
                  Hardware Equipment
                </Text>
              </View>
              <View className="bg-[#4d6029]/10 border border-[#4d6029]/20 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                  {displayEquipment.length} Items Installed
                </Text>
              </View>
            </View>

            <View className="space-y-2">
              {displayEquipment.map((item) => (
                <View
                  key={item.id}
                  className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex-row items-center justify-between mb-2"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-xl bg-[#4d6029] items-center justify-center mr-2.5">
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
                        className="text-xs font-poppins-bold text-[#0f172a]"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        className="text-[10px] font-poppins text-[#64748b]"
                        numberOfLines={1}
                      >
                        {item.type} {item.serial ? `· SN: ${item.serial}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2 py-0.5 rounded-lg flex-row items-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-[#AEAC78] mr-1" />
                    <Text className="text-[9px] font-poppins-bold text-[#2d3416]">
                      {item.status || "OPERATIONAL"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Splitter Port Matrix */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <MaterialCommunityIcons
                    name="lan"
                    size={16}
                    color="#4d6029"
                  />
                </View>
                <Text className="text-sm font-poppins-bold text-[#0f172a]">
                  Port Allocation
                </Text>
              </View>
              <View className="bg-[#4d6029]/10 border border-[#4d6029]/20 px-2.5 py-0.5 rounded-full">
                <Text className="text-[11px] font-poppins-bold text-[#4d6029]">
                  {portsOccupied} / {box.totalPorts} Assigned
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
              {Array.from({ length: box.totalPorts }).map((_, i) => {
                const portNum = i + 1;
                const clientOnPort = (box.clients || []).find(
                  (c) =>
                    c.portNumber === portNum || c.port === `Port ${portNum}`,
                );
                const isOccupied =
                  Boolean(clientOnPort) || portNum <= portsOccupied;

                return (
                  <View
                    key={portNum}
                    className={`w-11 h-12 rounded-2xl items-center justify-center border ${
                      isOccupied
                        ? "bg-[#4d6029] border-[#3e4e20] shadow-xs"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <Ionicons
                      name="hardware-chip"
                      size={14}
                      color={isOccupied ? "#ffffff" : "#94a3b8"}
                    />
                    <Text
                      className={`text-[9px] font-poppins-bold mt-0.5 ${
                        isOccupied ? "text-white" : "text-[#94a3b8]"
                      }`}
                    >
                      P{portNum}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Connected Subscribers / Clients */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-5 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <Ionicons name="people" size={16} color="#4d6029" />
                </View>
                <Text className="text-sm font-poppins-bold text-[#0f172a]">
                  Client Connected
                </Text>
              </View>
              <Text className="text-xs font-poppins text-[#64748b]">
                {box.clients?.length || 0} Registered
              </Text>
            </View>

            {!box.clients || box.clients.length === 0 ? (
              <View className="bg-slate-50 p-6 rounded-2xl border border-slate-100 items-center justify-center">
                <Ionicons name="people-outline" size={28} color="#94a3b8" />
                <Text className="text-xs font-poppins-bold text-slate-700 mt-2">
                  No Active Subscribers
                </Text>
                <Text className="text-[11px] font-poppins text-slate-400 text-center mt-0.5">
                  All {box.totalPorts} ports currently open for field
                  allocation.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {box.clients.map((sub, idx) => (
                  <View
                    key={sub.id || idx}
                    className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-8 h-8 rounded-xl bg-[#4d6029] items-center justify-center mr-3">
                        <Text className="text-[10px] font-poppins-bold text-white">
                          P
                          {sub.portNumber ||
                            sub.port.replace(/[^0-9]/g, "") ||
                            idx + 1}
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
                                sub.clientType.toUpperCase().includes("COMMERCIAL")
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-emerald-50 border-emerald-200"
                              }`}
                            >
                              <Text
                                className={`text-[8px] font-poppins-bold ${
                                  sub.clientType.toUpperCase().includes("COMMERCIAL")
                                    ? "text-blue-700"
                                    : "text-emerald-700"
                                }`}
                              >
                                {sub.clientType.toUpperCase().includes("COMMERCIAL")
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

                    <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2 py-0.5 rounded-lg flex-row items-center">
                      <View className="w-1.5 h-1.5 rounded-full bg-[#AEAC78] mr-1" />
                      <Text className="text-[9px] font-poppins-bold text-[#2d3416]">
                        {sub.status || "CONNECTED"}
                      </Text>
                    </View>
                  </View>
                ))}
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
          onRequestClose={() => setIsAuditModalOpen(false)}
        >
          <View className="flex-1 bg-black/75 items-center justify-center p-4">
            <View className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100">
              <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
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
                  className="p-1.5 rounded-full bg-slate-100"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                {/* Physical Padlock Verification Toggle */}
                <TouchableOpacity
                  onPress={() => setPadlockVerified(!padlockVerified)}
                  className={`p-3.5 rounded-2xl border flex-row items-center justify-between mb-3 ${
                    padlockVerified
                      ? "bg-[#AEAC78]/20 border-[#AEAC78]/70"
                      : "bg-rose-50/70 border-rose-200"
                  }`}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <Ionicons
                      name={padlockVerified ? "lock-closed" : "lock-open"}
                      size={18}
                      color={padlockVerified ? "#4d6029" : "#dc2626"}
                    />
                    <View className="ml-2.5 flex-1">
                      <Text className="text-xs font-poppins-bold text-[#0f172a]">
                        Cabinet Padlock & Seal
                      </Text>
                      <Text className="text-[10px] font-poppins text-[#64748b]">
                        {padlockVerified
                          ? "Physical lock latched and intact"
                          : "Lock unlatched or seal broken"}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded-lg border ${
                      padlockVerified
                        ? "bg-[#AEAC78]/30 border-[#AEAC78]/80"
                        : "bg-rose-100 border border-rose-300"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-poppins-bold ${
                        padlockVerified ? "text-[#4d6029]" : "text-rose-800"
                      }`}
                    >
                      {padlockVerified ? "VERIFIED" : "ISSUE"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Status Selection */}
                <View className="mb-3">
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                    Box Operational Status:
                  </Text>
                  <View className="flex-row gap-2">
                    {(["ACTIVE", "NEEDS_TAG", "ISSUE"] as const).map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setAuditStatus(st)}
                        className={`flex-1 py-2 rounded-xl items-center border ${
                          auditStatus === st
                            ? st === "ACTIVE"
                              ? "bg-[#4d6029] border-[#3e4e20]"
                              : st === "NEEDS_TAG"
                                ? "bg-amber-600 border-amber-700"
                                : "bg-rose-600 border-rose-700"
                            : "bg-slate-100 border-slate-200"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-poppins-bold ${
                            auditStatus === st ? "text-white" : "text-[#475569]"
                          }`}
                        >
                          {st === "ACTIVE"
                            ? "Active"
                            : st === "NEEDS_TAG"
                              ? "Needs Tag"
                              : "Issue"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Hardware Issue Selection Chips or Operational Confirmation */}
                {auditStatus === "ISSUE" ? (
                  <View className="mb-3 bg-rose-50/70 border border-rose-200/90 rounded-2xl p-3">
                    <Text className="text-[11px] font-poppins-bold text-rose-900 mb-2">
                      Select Problem Type:
                    </Text>
                    <View className="flex-row flex-wrap justify-between">
                      {[
                        {
                          id: "Cable Damage / Cut",
                          icon: "flash-off",
                          label: "Cable Cut / Damage",
                        },
                        {
                          id: "Defective Port / Splitter",
                          icon: "hardware-chip",
                          label: "Defective Splitter / Port",
                        },
                        {
                          id: "Broken Lock / Door",
                          icon: "lock-open",
                          label: "Broken Lock / Door",
                        },
                        {
                          id: "Water / Weather Damage",
                          icon: "rainy",
                          label: "Water / Weather Damage",
                        },
                      ].map((issue) => (
                        <TouchableOpacity
                          key={issue.id}
                          onPress={() => setSelectedIssueType(issue.id)}
                          className={`w-[48.5%] mb-2 py-2 px-2.5 rounded-xl border flex-row items-center min-h-[42px] ${
                            selectedIssueType === issue.id
                              ? "bg-rose-600 border-rose-700 shadow-sm"
                              : "bg-white border-rose-200"
                          }`}
                        >
                          <Ionicons
                            name={issue.icon as any}
                            size={13}
                            color={
                              selectedIssueType === issue.id
                                ? "#ffffff"
                                : "#dc2626"
                            }
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            className={`text-[10px] leading-tight font-poppins-bold flex-1 ${
                              selectedIssueType === issue.id
                                ? "text-white"
                                : "text-rose-800"
                            }`}
                          >
                            {issue.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View className="mb-3 bg-[#AEAC78]/20 border border-[#AEAC78]/70 rounded-2xl p-3 flex-row items-center">
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#4d6029"
                    />
                    <Text className="text-[11px] font-poppins text-[#4d6029] ml-2 flex-1">
                      All optical ports, enclosure, and hardware verified operational on-site.
                    </Text>
                  </View>
                )}

                {/* Audit Notes Input */}
                <View>
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1">
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
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-poppins text-[#0f172a] h-20 text-top"
                  />
                </View>
              </View>

              {/* Submit / Cancel Buttons */}
              <View className="flex-row pt-4 mt-4 border-t border-slate-100 gap-2">
                <TouchableOpacity
                  onPress={() => {
                    if (isWeb) {
                      handleSubmitAudit();
                    } else {
                      Alert.alert(
                        "Submit Field Inspection",
                        `Confirm inspection submission for ${box.code}?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Submit", onPress: handleSubmitAudit },
                        ],
                      );
                    }
                  }}
                  disabled={isSubmittingAudit}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row shadow-xs active:opacity-85"
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
                        Submit Inspection Report
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsAuditModalOpen(false)}
                  disabled={isSubmittingAudit}
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
