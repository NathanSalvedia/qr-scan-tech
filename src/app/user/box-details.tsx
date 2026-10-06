import { BOX_PINS } from "@/constants/distribution-boxes";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

interface SubscriberItem {
  port: number;
  name: string;
  plan: string;
  signal: string;
  status: "Active" | "Offline";
}

export interface HardwareEquipmentItem {
  id: string;
  name: string;
  type: string;
  category:
    | "Optical Equipment"
    | "Circuit / Internal Management"
    | "Distribution Hardware"
    | "Protection Hardware";
  serial?: string;
  status: "Operational" | "Faulty" | "Needs Check";
}

interface BoxDetailData {
  code: string;
  category: "MAIN_BOX" | "SUB_BOX";
  parentCode?: string;
  downstreamBranches?: number;
  tier: string;
  status: "Operational" | "Warning" | "Overloaded";
  location: string;
  zone: string;
  gps: string;
  splitterType: string;
  portsUsed: number;
  totalPorts: number;
  opticalLoss: string;
  temperature: string;
  lockStatus: "Secured" | "Unlatched" | "Damaged";
  equipment: HardwareEquipmentItem[];
  subscribers: SubscriberItem[];
}

export default function BoxDetailsScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const boxCodeParam = (params.code || "DB-MN-01").toUpperCase().trim();

  // Audit modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditNotes, setAuditNotes] = useState("");
  const [padlockVerified, setPadlockVerified] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isWeb = Platform.OS === "web";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const getBoxData = (code: string): BoxDetailData => {
    const upper = code.toUpperCase().trim();
    if (
      upper === "DB-SB-03" ||
      upper.includes("SB03") ||
      upper.includes("SB-03")
    ) {
      return {
        code: "DB-SB-03",
        category: "SUB_BOX",
        parentCode: "DB-MN-01 (Aguinaldo Central Hub)",
        tier: "Tier 2 · Sub-Distribution",
        status: "Warning",
        location: "Tibanga Highway near MSU-IIT Gate",
        zone: "Tibanga",
        gps: "8.2412, 124.2440",
        splitterType: "1:16 PLC Cassette Splitter",
        portsUsed: 14,
        totalPorts: 16,
        opticalLoss: "-25.4 dBm (Loss Warning)",
        temperature: "38.4°C",
        lockStatus: "Secured",
        equipment: [
          {
            id: "eq1",
            name: "1:16 PLC Cassette Splitter",
            type: "Optical Splitter",
            category: "Optical Equipment",
            serial: "SPL-16-092",
            status: "Operational",
          },
          {
            id: "eq2",
            name: "SC/UPC Fiber Adapters (16 Ports)",
            type: "Coupler Panel",
            category: "Optical Equipment",
            serial: "ADP-SC-1601",
            status: "Operational",
          },
          {
            id: "eq3",
            name: "15A DIN-Rail Circuit Breaker",
            type: "Breaker",
            category: "Circuit / Internal Management",
            serial: "CB-15A-88",
            status: "Operational",
          },
          {
            id: "eq4",
            name: "Fiber Splice Protection Sleeves",
            type: "Splice Tray",
            category: "Protection Hardware",
            serial: "SPT-24-04",
            status: "Operational",
          },
        ],
        subscribers: [
          {
            port: 1,
            name: "MSU-IIT Faculty Annex",
            plan: "Fiber Biz 200M",
            signal: "-25.1 dBm",
            status: "Active",
          },
          {
            port: 2,
            name: "Campus Tech Hub",
            plan: "Fiber Biz 500M",
            signal: "-25.4 dBm",
            status: "Active",
          },
          {
            port: 3,
            name: "Student Dorm Block C",
            plan: "Fiber Home 100M",
            signal: "-25.6 dBm",
            status: "Active",
          },
          {
            port: 4,
            name: "Tibanga Net Cafe",
            plan: "Fiber Biz 300M",
            signal: "-25.0 dBm",
            status: "Active",
          },
          {
            port: 5,
            name: "Elena Gomez",
            plan: "Fiber Home 50M",
            signal: "-24.8 dBm",
            status: "Active",
          },
          {
            port: 6,
            name: "Mark Ramos",
            plan: "Fiber Home 100M",
            signal: "-25.2 dBm",
            status: "Active",
          },
          {
            port: 7,
            name: "MSU-IIT Science Laboratory",
            plan: "Fiber Enterprise 1G",
            signal: "-25.5 dBm",
            status: "Active",
          },
          {
            port: 8,
            name: "Dormitory Dining Hall",
            plan: "Fiber Biz 100M",
            signal: "-25.3 dBm",
            status: "Active",
          },
        ],
      };
    } else if (
      upper === "DB-SB-06" ||
      upper.includes("SB06") ||
      upper === "DB-MN-05"
    ) {
      return {
        code: "DB-SB-06",
        category: "SUB_BOX",
        parentCode: "DB-MN-02 (Roxas Sub-Hub)",
        tier: "Tier 2 · Sub-Distribution",
        status: "Overloaded",
        location: "Tubod National Highway / Del Carmen",
        zone: "Tubod",
        gps: "8.2120, 124.2380",
        splitterType: "1:16 PLC Modular Tray",
        portsUsed: 16,
        totalPorts: 16,
        opticalLoss: "-20.1 dBm (Normal)",
        temperature: "41.2°C",
        lockStatus: "Secured",
        equipment: [
          {
            id: "eq5",
            name: "1:16 PLC Modular Splitter Tray",
            type: "Optical Splitter",
            category: "Optical Equipment",
            serial: "SPL-16-104",
            status: "Operational",
          },
          {
            id: "eq6",
            name: "SC/APC Quad Couplers (16 Ports)",
            type: "Adapter Plate",
            category: "Optical Equipment",
            serial: "ADP-APC-1602",
            status: "Operational",
          },
          {
            id: "eq7",
            name: "20A Miniature Breaker",
            type: "Breaker",
            category: "Circuit / Internal Management",
            serial: "CB-20A-41",
            status: "Operational",
          },
          {
            id: "eq8",
            name: "Weather-Sealed Grommets & Gaskets",
            type: "Enclosure Seal",
            category: "Protection Hardware",
            serial: "WSG-IP68-01",
            status: "Operational",
          },
        ],
        subscribers: [
          {
            port: 1,
            name: "Tubod Commercial Mart",
            plan: "Fiber Biz 500M",
            signal: "-19.4 dBm",
            status: "Active",
          },
          {
            port: 2,
            name: "Barangay Health Center",
            plan: "Fiber Biz 100M",
            signal: "-20.1 dBm",
            status: "Active",
          },
          {
            port: 3,
            name: "Carlos Mendoza",
            plan: "Fiber Home 100M",
            signal: "-19.8 dBm",
            status: "Active",
          },
          {
            port: 4,
            name: "Lourdes Santos",
            plan: "Fiber Home 50M",
            signal: "-20.4 dBm",
            status: "Active",
          },
          {
            port: 5,
            name: "Tubod Bakery & Cafe",
            plan: "Fiber Biz 200M",
            signal: "-20.2 dBm",
            status: "Active",
          },
          {
            port: 6,
            name: "Del Carmen Hardware",
            plan: "Fiber Biz 300M",
            signal: "-19.9 dBm",
            status: "Active",
          },
        ],
      };
    } else if (upper === "DB-MN-02" || upper.includes("MN02")) {
      return {
        code: "DB-MN-02",
        category: "MAIN_BOX",
        downstreamBranches: 4,
        tier: "Tier 1 · Main Distribution Box",
        status: "Operational",
        location: "Roxas Ave cor. Aguinaldo, Iligan City",
        zone: "Poblacion",
        gps: "8.2240, 124.2420",
        splitterType: "Main Optical Feeder 24-Port",
        portsUsed: 21,
        totalPorts: 24,
        opticalLoss: "-18.5 dBm (Optimal)",
        temperature: "33.0°C",
        lockStatus: "Secured",
        equipment: [
          {
            id: "eq9",
            name: "Main Optical Feeder 24-Port Panel",
            type: "Feeder Panel",
            category: "Optical Equipment",
            serial: "OFP-2402",
            status: "Operational",
          },
          {
            id: "eq10",
            name: "SC/APC Duplex Adapters (24 Ports)",
            type: "Adapters",
            category: "Optical Equipment",
            serial: "ADP-DUP-24",
            status: "Operational",
          },
          {
            id: "eq11",
            name: "Primary Circuit Breaker 40A",
            type: "Breaker",
            category: "Circuit / Internal Management",
            serial: "CB-40A-02",
            status: "Operational",
          },
          {
            id: "eq12",
            name: "Grounding Rod & Lightning Arrestor",
            type: "Surge Protection",
            category: "Protection Hardware",
            serial: "GND-LA-02",
            status: "Operational",
          },
        ],
        subscribers: [
          {
            port: 1,
            name: "Roxas Commercial Bank",
            plan: "500 Mbps Dedicated",
            signal: "-18.2 dBm",
            status: "Active",
          },
          {
            port: 2,
            name: "Poblacion Medical Clinic",
            plan: "300 Mbps Fiber",
            signal: "-18.5 dBm",
            status: "Active",
          },
          {
            port: 3,
            name: "Midtown Plaza Office",
            plan: "200 Mbps Business",
            signal: "-18.7 dBm",
            status: "Active",
          },
        ],
      };
    } else {
      // Default: DB-MN-01
      const foundBox = BOX_PINS.find((b) => b.code === upper);
      const isSubBox = foundBox
        ? foundBox.category === "SUB_BOX"
        : upper.startsWith("DB-SB");
      return {
        code: foundBox ? foundBox.code : "DB-MN-01",
        category: isSubBox ? "SUB_BOX" : "MAIN_BOX",
        parentCode: isSubBox
          ? foundBox?.parentCode || "DB-MN-01 (Aguinaldo Central Hub)"
          : undefined,
        downstreamBranches: isSubBox ? undefined : 6,
        tier: foundBox ? foundBox.tier : "Tier 1 · Main Backbone Box",
        status: "Operational",
        location: foundBox
          ? foundBox.address
          : "Aguinaldo St, Poblacion Commercial Hub",
        zone: foundBox ? foundBox.zone : "Poblacion",
        gps: foundBox
          ? `${foundBox.latitude.toFixed(4)}, ${foundBox.longitude.toFixed(4)}`
          : "8.2285, 124.2415",
        splitterType: "1:16 PLC Cassette Splitter",
        portsUsed: foundBox ? Math.min(foundBox.portsUsed, 14) : 14,
        totalPorts: 16,
        opticalLoss: foundBox
          ? `${foundBox.opticalLoss} (Optimal)`
          : "-18.2 dBm (Optimal)",
        temperature: foundBox ? foundBox.temperature : "34.6°C",
        lockStatus: "Secured",
        equipment: [
          {
            id: "eq13",
            name: "1:16 PLC Cassette Optical Splitter",
            type: "Optical Splitter",
            category: "Optical Equipment",
            serial: "SPL-16-001",
            status: "Operational",
          },
          {
            id: "eq14",
            name: "Fiber Optic Adapters (16-Port SC/APC)",
            type: "Coupler Plate",
            category: "Optical Equipment",
            serial: "ADP-APC-1601",
            status: "Operational",
          },
          {
            id: "eq15",
            name: "Primary Circuit Breaker 30A",
            type: "Breaker",
            category: "Circuit / Internal Management",
            serial: "CB-30A-01",
            status: "Operational",
          },
          {
            id: "eq16",
            name: "24-Core Splice Tray & Pigtails",
            type: "Splice & Tray",
            category: "Distribution Hardware",
            serial: "SPT-24-01",
            status: "Operational",
          },
        ],
        subscribers: [
          {
            port: 1,
            name: "Iligan City Public Library",
            plan: "Fiber Enterprise 1G",
            signal: "-17.8 dBm",
            status: "Active",
          },
          {
            port: 2,
            name: "Poblacion Pharmacy",
            plan: "Fiber Biz 300M",
            signal: "-18.1 dBm",
            status: "Active",
          },
          {
            port: 3,
            name: "Aguinaldo Law Offices",
            plan: "Fiber Biz 200M",
            signal: "-18.4 dBm",
            status: "Active",
          },
          {
            port: 4,
            name: "Metro Finance Iligan",
            plan: "Fiber Biz 500M",
            signal: "-17.9 dBm",
            status: "Active",
          },
          {
            port: 5,
            name: "Roberto Tan Residence",
            plan: "Fiber Home 100M",
            signal: "-18.5 dBm",
            status: "Active",
          },
          {
            port: 6,
            name: "Green Cafe Poblacion",
            plan: "Fiber Biz 150M",
            signal: "-18.2 dBm",
            status: "Active",
          },
          {
            port: 7,
            name: "City Dental Clinic",
            plan: "Fiber Biz 200M",
            signal: "-18.0 dBm",
            status: "Active",
          },
          {
            port: 8,
            name: "Aguinaldo Convenience Store",
            plan: "Fiber Home 100M",
            signal: "-18.3 dBm",
            status: "Active",
          },
        ],
      };
    }
  };

  const box = getBoxData(boxCodeParam);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/user/scanner");
    }
  };

  const handleSubmitAudit = () => {
    setIsAuditModalOpen(false);
    setAuditNotes("");
    showToast(`Audit for ${box.code} successfully recorded and synced.`);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#f8fafc]">
      <StatusBar style="light" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <View className="mx-4 mt-2 bg-[#4d6029] border border-[#3e4e20] px-4 py-3 rounded-2xl flex-row items-center justify-between shadow-lg z-50">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
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
      <View className="bg-[#4d6029] px-5 py-4 flex-row items-center justify-between shadow-md">
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
            <View className="flex-row items-center">
              <Text className="text-lg text-center font-poppins-bold text-white">
                {box.code}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Scrollable Page Body */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="max-w-2xl w-full self-center">
          {/* 🌟 Dedicated Main Box / Sub Box Classification & Hierarchy Card */}
          {box.category === "MAIN_BOX" ? (
            <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-sm shadow-slate-200/50">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="server-network"
                      size={20}
                      color="#4d6029"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-poppins-bold text-[#0f172a]">
                      Main Distribution Box
                    </Text>
                  </View>
                </View>
                <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2.5 py-1 rounded-xl">
                  <Text className="text-[10px] font-poppins-bold text-[#2d3416]">
                    MAIN BOX
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-sm shadow-slate-200/50">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-2xl bg-amber-500/10 items-center justify-center mr-3">
                    <MaterialCommunityIcons
                      name="server-network"
                      size={20}
                      color="#b45309"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-poppins-bold text-[#0f172a]">
                      Sub-Distribution Box
                    </Text>
                  </View>
                </View>
                <View className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                  <Text className="text-[10px] font-poppins-bold text-[#b45309]">
                    SUB-DISTRIBUTION BOX
                  </Text>
                </View>
              </View>

              <View className="pt-3 border-t border-slate-100 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons
                    name="git-network-outline"
                    size={14}
                    color="#64748b"
                  />
                  <Text className="text-xs font-poppins-medium text-[#475569] ml-1.5">
                    Main Box:
                  </Text>
                </View>
                <View className="bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-xl">
                  <Text className="text-xs font-poppins-bold text-[#0f172a]">
                    {box.parentCode || "DB-MN-01 (Aguinaldo Central Hub)"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 1. Location & GIS Coordinates Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-start flex-1 mr-2">
                <View className="w-9 h-9 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="location" size={18} color="#4d6029" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-poppins-bold text-[#0f172a]">
                    {box.location}
                  </Text>
                  <Text className="text-xs font-poppins text-[#64748b] mt-0.5">
                    Zone: {box.zone} · GPS: {box.gps}
                  </Text>
                </View>
              </View>
              <View className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
                <Text className="text-[10px] font-poppins-semibold text-[#475569]">
                  Utility Pole
                </Text>
              </View>
            </View>
          </View>

          {/* 2. 🛠️ DEDICATED HARDWARE & EQUIPMENT CARD */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-sm shadow-slate-200/50">
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
              <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-poppins-bold text-[#2d3416]">
                  {box.equipment.length} Items Installed
                </Text>
              </View>
            </View>

            {/* Equipment Items List */}
            <View className="space-y-2.5">
              {box.equipment.map((item) => (
                <View
                  key={item.id}
                  className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex-row items-center justify-between mb-2"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-xl bg-[#4d6029] items-center justify-center mr-2.5">
                      <MaterialCommunityIcons
                        name={
                          item.category === "Optical Equipment"
                            ? "resistor-nodes"
                            : item.category === "Circuit / Internal Management"
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
                    <View className="w-1.5 h-1.5 rounded-full bg-[#4d6029] mr-1" />
                    <Text className="text-[9px] font-poppins-bold text-[#2d3416]">
                      {item.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 2. Splitter Port Matrix */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-poppins-bold text-[#0f172a]">
                Port Allocated
              </Text>
              <View className="bg-[#AEAC78]/25 border border-[#AEAC78]/80 px-2.5 py-0.5 rounded-full">
                <Text className="text-[11px] font-poppins-bold text-[#2d3416]">
                  {box.portsUsed}/{box.totalPorts} Used
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
              {Array.from({ length: box.totalPorts }).map((_, i) => {
                const portNum = i + 1;
                const isOccupied = portNum <= box.portsUsed;
                return (
                  <View
                    key={portNum}
                    className={`w-11 h-12 rounded-2xl items-center justify-center border ${
                      isOccupied
                        ? "bg-[#AEAC78]/25 border-[#AEAC78]/90 shadow-xs"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <Ionicons
                      name="hardware-chip"
                      size={15}
                      color={isOccupied ? "#4d6029" : "#94a3b8"}
                    />
                    <Text
                      className={`text-[9px] font-poppins-bold mt-0.5 ${
                        isOccupied ? "text-[#2d3416]" : "text-[#94a3b8]"
                      }`}
                    >
                      P{portNum}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 3. Connected Subscribers */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-5 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-poppins-bold text-[#0f172a]">
                Connected Clients
              </Text>
              <Text className="text-xs font-poppins text-[#64748b]">
                {box.subscribers.length} Registered
              </Text>
            </View>

            <View className="gap-2.5">
              {box.subscribers.map((sub) => (
                <View
                  key={sub.port}
                  className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-xl bg-[#AEAC78]/30 border border-[#AEAC78]/80 items-center justify-center mr-3">
                      <Text className="text-[11px] font-poppins-bold text-[#2d3416]">
                        P{sub.port}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-xs font-poppins-bold text-[#0f172a]"
                        numberOfLines={1}
                      >
                        {sub.name}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Audit Inspection Modal */}
      {isAuditModalOpen && (
        <Modal
          visible={isAuditModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAuditModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
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
                    Audit {box.code}
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
                  className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                    padlockVerified
                      ? "bg-[#AEAC78]/25 border-[#AEAC78]/80"
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
                        Padlock & Enclosure Seal
                      </Text>
                      <Text className="text-[10px] font-poppins text-[#64748b]">
                        {padlockVerified
                          ? "Secured and intact"
                          : "Damaged / Unlatched"}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded-lg ${
                      padlockVerified
                        ? "bg-[#AEAC78]/40 border border-[#AEAC78]/80"
                        : "bg-rose-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-poppins-bold ${
                        padlockVerified ? "text-[#2d3416]" : "text-rose-800"
                      }`}
                    >
                      {padlockVerified ? "VERIFIED" : "ISSUE"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Audit Notes Input */}
                <View>
                  <Text className="text-xs font-poppins-semibold text-[#475569] mb-1.5">
                    Field Observations & Notes:
                  </Text>
                  <TextInput
                    placeholder="Enter optical readings, fiber condition, or maintenance tags..."
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
              <View className="flex-row space-x-2 pt-4 mt-4 border-t border-slate-100">
                <TouchableOpacity
                  onPress={() => {
                    if (isWeb) {
                      handleSubmitAudit();
                    } else {
                      Alert.alert(
                        "Submit Field Audit",
                        `Confirm audit submission for ${box.code}?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Submit", onPress: handleSubmitAudit },
                        ],
                      );
                    }
                  }}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row mr-2 shadow-xs"
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                  <Text className="text-white text-xs font-poppins-bold ml-1.5">
                    Submit Audit Report
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsAuditModalOpen(false)}
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
