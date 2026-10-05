import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { BOX_PINS, BoxPin } from "@/constants/distribution-boxes";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScanHistoryEntry {
  id: string;
  boxCode: string;
  tier: string;
  category: "MAIN_BOX" | "SUB_BOX";
  status: "ACTIVE" | "NEEDS_TAG" | "ISSUE";
  opticalLoss: string;
  portsUsed: number;
  totalPorts: number;
  timeLabel: string;
  dateGroup: "TODAY" | "YESTERDAY" | "EARLIER";
  auditNote: string;
  padlockVerified: boolean;
  boxData: BoxPin;
}

export default function UserBoxesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"HISTORY" | "ALL_BOXES">(
    "HISTORY",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "ISSUE" | "NEEDS_TAG"
  >("ALL");
  const [selectedBox, setSelectedBox] = useState<BoxPin | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Structured Scan History records linking to distribution boxes
  const scanHistoryData: ScanHistoryEntry[] = [
    {
      id: "scan-1",
      boxCode: "DB-MN-01",
      tier: "Tier 1 · Main Feeder",
      category: "MAIN_BOX",
      status: "ACTIVE",
      opticalLoss: "-18.2 dBm",
      portsUsed: 44,
      totalPorts: 48,
      timeLabel: "10:45 AM",
      dateGroup: "TODAY",
      auditNote: "Routine audit passed. Padlock sealed. Cable routing neat.",
      padlockVerified: true,
      boxData: BOX_PINS[0],
    },
    {
      id: "scan-2",
      boxCode: "DB-TB-01",
      tier: "Tier 2 · Sub-Distribution",
      category: "SUB_BOX",
      status: "ACTIVE",
      opticalLoss: "-19.4 dBm",
      portsUsed: 14,
      totalPorts: 16,
      timeLabel: "09:20 AM",
      dateGroup: "TODAY",
      auditNote: "Splitter ports 1-14 active. Port 15-16 spare.",
      padlockVerified: true,
      boxData: BOX_PINS[2] || BOX_PINS[0],
    },
    {
      id: "scan-3",
      boxCode: "DB-SM-02",
      tier: "Tier 2 · Sub-Distribution",
      category: "SUB_BOX",
      status: "ISSUE",
      opticalLoss: "-24.8 dBm",
      portsUsed: 8,
      totalPorts: 8,
      timeLabel: "08:15 AM",
      dateGroup: "TODAY",
      auditNote: "High optical attenuation detected on feeder drop line.",
      padlockVerified: true,
      boxData: BOX_PINS[4] || BOX_PINS[0],
    },
    {
      id: "scan-4",
      boxCode: "DB-MN-02",
      tier: "Tier 1 · Main Feeder",
      category: "MAIN_BOX",
      status: "ACTIVE",
      opticalLoss: "-17.5 dBm",
      portsUsed: 21,
      totalPorts: 24,
      timeLabel: "04:30 PM",
      dateGroup: "YESTERDAY",
      auditNote: "Primary 40A breaker verified. Optical level optimal.",
      padlockVerified: true,
      boxData: BOX_PINS[1] || BOX_PINS[0],
    },
    {
      id: "scan-5",
      boxCode: "DB-SB-04",
      tier: "Tier 2 · Sub-Distribution",
      category: "SUB_BOX",
      status: "NEEDS_TAG",
      opticalLoss: "-20.1 dBm",
      portsUsed: 6,
      totalPorts: 8,
      timeLabel: "02:15 PM",
      dateGroup: "YESTERDAY",
      auditNote: "Physical QR label weathered. Replacement tag requested.",
      padlockVerified: false,
      boxData: BOX_PINS[5] || BOX_PINS[0],
    },
    {
      id: "scan-6",
      boxCode: "DB-PL-01",
      tier: "Tier 2 · Sub-Distribution",
      category: "SUB_BOX",
      status: "ACTIVE",
      opticalLoss: "-18.9 dBm",
      portsUsed: 12,
      totalPorts: 16,
      timeLabel: "11:00 AM",
      dateGroup: "EARLIER",
      auditNote: "Sub-distribution splice tray cleaned and inspected.",
      padlockVerified: true,
      boxData: BOX_PINS[3] || BOX_PINS[0],
    },
  ];

  // Filtered History
  const filteredHistory = scanHistoryData.filter((entry) => {
    const matchesSearch =
      entry.boxCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.auditNote.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || entry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered All Boxes Directory
  const filteredAllBoxes = BOX_PINS.filter((box) => {
    const matchesSearch =
      box.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      box.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      box.tier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || box.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenBoxDetails = (box: BoxPin) => {
    setSelectedBox(box);
    setShowDetailModal(true);
  };

  const getStatusPill = (status: "ACTIVE" | "NEEDS_TAG" | "ISSUE") => {
    if (status === "ACTIVE") {
      return (
        <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full flex-row items-center">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
          <Text className="text-[10px] font-poppins-semibold text-emerald-800">
            Operational
          </Text>
        </View>
      );
    }
    if (status === "ISSUE") {
      return (
        <View className="bg-rose-100 px-2.5 py-0.5 rounded-full flex-row items-center">
          <View className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5" />
          <Text className="text-[10px] font-poppins-semibold text-rose-800">
            Signal Loss
          </Text>
        </View>
      );
    }
    return (
      <View className="bg-amber-100 px-2.5 py-0.5 rounded-full flex-row items-center">
        <View className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5" />
        <Text className="text-[10px] font-poppins-semibold text-amber-800">
          Needs Tag
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      {/* Main Container */}
      <View className="flex-1 px-4 pt-3 max-w-[600px] w-full self-center">
        {/* Top Screen Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-[11px] font-poppins-semibold tracking-wider text-[#64748b] uppercase">
              MultiFactors Sales
            </Text>
            <Text className="text-2xl font-poppins-bold text-[#0f172a] mt-0.5">
              Scan History & Box Log
            </Text>
          </View>
          <View className="w-10 h-10 rounded-2xl bg-[#4d6029]/10 items-center justify-center border border-[#4d6029]/20">
            <MaterialCommunityIcons
              name="archive-clock-outline"
              size={22}
              color="#4d6029"
            />
          </View>
        </View>

        {/* Segmented Dual Tab Switcher */}
        <View className="flex-row bg-slate-200/70 p-1 rounded-xl mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("HISTORY")}
            className={`flex-1 py-2 rounded-lg items-center justify-center flex-row ${
              activeTab === "HISTORY"
                ? "bg-white shadow-sm shadow-slate-300"
                : "bg-transparent"
            }`}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={activeTab === "HISTORY" ? "#4d6029" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs ${
                activeTab === "HISTORY"
                  ? "font-poppins-bold text-[#4d6029]"
                  : "font-poppins-medium text-[#64748b]"
              }`}
            >
              Scan History ({scanHistoryData.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("ALL_BOXES")}
            className={`flex-1 py-2 rounded-lg items-center justify-center flex-row ${
              activeTab === "ALL_BOXES"
                ? "bg-white shadow-sm shadow-slate-300"
                : "bg-transparent"
            }`}
            activeOpacity={0.8}
          >
            <Ionicons
              name="albums-outline"
              size={15}
              color={activeTab === "ALL_BOXES" ? "#4d6029" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-xs ${
                activeTab === "ALL_BOXES"
                  ? "font-poppins-bold text-[#4d6029]"
                  : "font-poppins-medium text-[#64748b]"
              }`}
            >
              All Boxes ({BOX_PINS.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="bg-white rounded-xl px-3.5 py-2.5 flex-row items-center border border-slate-200 shadow-sm mb-3">
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            placeholder={
              activeTab === "HISTORY"
                ? "Search by box code (e.g. DB-MN-01)..."
                : "Search box directory..."
            }
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2.5 text-xs font-poppins-medium text-[#0f172a] p-0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View className="flex-row mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 12 }}
          >
            <TouchableOpacity
              onPress={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-full mr-2 border ${
                statusFilter === "ALL"
                  ? "bg-[#4d6029] border-[#4d6029]"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-[11px] font-poppins-semibold ${
                  statusFilter === "ALL" ? "text-white" : "text-[#64748b]"
                }`}
              >
                All (
                {activeTab === "HISTORY"
                  ? scanHistoryData.length
                  : BOX_PINS.length}
                )
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-full mr-2 border flex-row items-center ${
                statusFilter === "ACTIVE"
                  ? "bg-emerald-600 border-emerald-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              <Text
                className={`text-[11px] font-poppins-semibold ${
                  statusFilter === "ACTIVE" ? "text-white" : "text-[#64748b]"
                }`}
              >
                Operational
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter("ISSUE")}
              className={`px-3 py-1.5 rounded-full mr-2 border flex-row items-center ${
                statusFilter === "ISSUE"
                  ? "bg-rose-600 border-rose-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
              <Text
                className={`text-[11px] font-poppins-semibold ${
                  statusFilter === "ISSUE" ? "text-white" : "text-[#64748b]"
                }`}
              >
                Issues
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter("NEEDS_TAG")}
              className={`px-3 py-1.5 rounded-full border flex-row items-center ${
                statusFilter === "NEEDS_TAG"
                  ? "bg-amber-500 border-amber-500"
                  : "bg-white border-slate-200"
              }`}
            >
              <View className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
              <Text
                className={`text-[11px] font-poppins-semibold ${
                  statusFilter === "NEEDS_TAG" ? "text-white" : "text-[#64748b]"
                }`}
              >
                Needs Tag
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Scrollable Content: Tab 1 (Scan History) or Tab 2 (All Boxes Directory) */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {activeTab === "HISTORY" ? (
            /* TAB 1: SCAN HISTORY LIST */
            filteredHistory.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center justify-center border border-slate-200/80 my-4">
                <Ionicons name="file-tray-outline" size={38} color="#94a3b8" />
                <Text className="text-sm font-poppins-bold text-[#0f172a] mt-3">
                  No Scans Found
                </Text>
                <Text className="text-xs font-poppins-medium text-[#64748b] text-center mt-1">
                  Try adjusting your search query or filter tags.
                </Text>
              </View>
            ) : (
              <View>
                {/* Date Group: Today */}
                <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase mb-2 ml-1">
                  Today · Oct 5, 2026
                </Text>
                {filteredHistory
                  .filter((item) => item.dateGroup === "TODAY")
                  .map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleOpenBoxDetails(item.boxData)}
                      className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 active:bg-slate-50"
                      activeOpacity={0.78}
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                            <MaterialCommunityIcons
                              name="cube-outline"
                              size={18}
                              color="#4d6029"
                            />
                          </View>
                          <View>
                            <Text className="text-sm font-poppins-bold text-[#0f172a]">
                              {item.boxCode}
                            </Text>
                            <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                              {item.tier}
                            </Text>
                          </View>
                        </View>
                        {getStatusPill(item.status)}
                      </View>

                      {/* Technical Specs Row */}
                      <View className="flex-row items-center justify-between bg-[#f8fafc] rounded-xl p-2.5 my-1.5 border border-slate-100">
                        <View className="flex-row items-center">
                          <Ionicons
                            name="flash-outline"
                            size={13}
                            color="#4d6029"
                          />
                          <Text className="text-[11px] font-poppins-semibold text-[#0f172a] ml-1">
                            {item.opticalLoss}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons
                            name="lan"
                            size={13}
                            color="#64748b"
                          />
                          <Text className="text-[11px] font-poppins-medium text-[#475569] ml-1">
                            {item.portsUsed}/{item.totalPorts} Ports
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons
                            name="time-outline"
                            size={13}
                            color="#64748b"
                          />
                          <Text className="text-[11px] font-poppins-medium text-[#64748b] ml-1">
                            {item.timeLabel}
                          </Text>
                        </View>
                      </View>

                      {/* Audit Note & Padlock Status */}
                      <View className="flex-row items-center justify-between mt-1">
                        <Text
                          numberOfLines={1}
                          className="text-[10px] font-poppins-regular text-[#64748b] flex-1 pr-2"
                        >
                          {item.auditNote}
                        </Text>
                        <View className="flex-row items-center">
                          <Ionicons
                            name={
                              item.padlockVerified ? "lock-closed" : "lock-open"
                            }
                            size={12}
                            color={item.padlockVerified ? "#16a34a" : "#d97706"}
                          />
                          <Text
                            className={`text-[10px] font-poppins-semibold ml-1 ${
                              item.padlockVerified
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {item.padlockVerified ? "Secured" : "Unlatched"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}

                {/* Date Group: Yesterday / Earlier */}
                {filteredHistory.some((item) => item.dateGroup !== "TODAY") && (
                  <View className="mt-3">
                    <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase mb-2 ml-1">
                      Yesterday & Earlier
                    </Text>
                    {filteredHistory
                      .filter((item) => item.dateGroup !== "TODAY")
                      .map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleOpenBoxDetails(item.boxData)}
                          className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 active:bg-slate-50"
                          activeOpacity={0.78}
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                              <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-2.5">
                                <MaterialCommunityIcons
                                  name="cube-outline"
                                  size={18}
                                  color="#475569"
                                />
                              </View>
                              <View>
                                <Text className="text-sm font-poppins-bold text-[#0f172a]">
                                  {item.boxCode}
                                </Text>
                                <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                                  {item.tier}
                                </Text>
                              </View>
                            </View>
                            {getStatusPill(item.status)}
                          </View>

                          <View className="flex-row items-center justify-between bg-[#f8fafc] rounded-xl p-2.5 my-1.5 border border-slate-100">
                            <View className="flex-row items-center">
                              <Ionicons
                                name="flash-outline"
                                size={13}
                                color="#4d6029"
                              />
                              <Text className="text-[11px] font-poppins-semibold text-[#0f172a] ml-1">
                                {item.opticalLoss}
                              </Text>
                            </View>
                            <View className="flex-row items-center">
                              <MaterialCommunityIcons
                                name="lan"
                                size={13}
                                color="#64748b"
                              />
                              <Text className="text-[11px] font-poppins-medium text-[#475569] ml-1">
                                {item.portsUsed}/{item.totalPorts} Ports
                              </Text>
                            </View>
                            <View className="flex-row items-center">
                              <Ionicons
                                name="time-outline"
                                size={13}
                                color="#64748b"
                              />
                              <Text className="text-[11px] font-poppins-medium text-[#64748b] ml-1">
                                {item.timeLabel}
                              </Text>
                            </View>
                          </View>

                          <Text
                            numberOfLines={1}
                            className="text-[10px] font-poppins-regular text-[#64748b] mt-1"
                          >
                            {item.auditNote}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}
              </View>
            )
          ) : (
            /* TAB 2: ALL NETWORK BOXES DIRECTORY */
            <View>
              <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase mb-2 ml-1">
                Network Inventory ({filteredAllBoxes.length} Boxes)
              </Text>
              {filteredAllBoxes.map((box) => (
                <TouchableOpacity
                  key={box.id}
                  onPress={() => handleOpenBoxDetails(box)}
                  className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 active:bg-slate-50"
                  activeOpacity={0.78}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className="w-10 h-10 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-3 border border-[#4d6029]/20">
                        <MaterialCommunityIcons
                          name="qrcode"
                          size={20}
                          color="#4d6029"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-poppins-bold text-[#0f172a]">
                          {box.code}
                        </Text>
                        <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                          {box.tier} ·{" "}
                          {box.category === "MAIN_BOX"
                            ? "Main Feeder"
                            : "Sub-Dist"}
                        </Text>
                      </View>
                    </View>
                    {getStatusPill(box.status)}
                  </View>

                  <View className="flex-row items-center justify-between bg-[#f8fafc] rounded-xl p-2.5 my-1.5 border border-slate-100">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="speedometer-outline"
                        size={13}
                        color="#4d6029"
                      />
                      <Text className="text-[11px] font-poppins-semibold text-[#0f172a] ml-1">
                        {box.opticalLoss}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <MaterialCommunityIcons
                        name="lan"
                        size={13}
                        color="#64748b"
                      />
                      <Text className="text-[11px] font-poppins-medium text-[#475569] ml-1">
                        {box.portsUsed}/{box.totalPorts} Ports
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name="thermometer-outline"
                        size={13}
                        color="#64748b"
                      />
                      <Text className="text-[11px] font-poppins-medium text-[#64748b] ml-1">
                        {box.temperature}
                      </Text>
                    </View>
                  </View>

                  {/* Hardware Equipment Tag Pills */}
                  <View className="flex-row flex-wrap mt-1">
                    {box.equipmentItems.slice(0, 2).map((eq, idx) => (
                      <View
                        key={idx}
                        className="bg-slate-100 px-2 py-0.5 rounded-md mr-1.5 mb-1"
                      >
                        <Text className="text-[9px] font-poppins-medium text-[#475569]">
                          {eq}
                        </Text>
                      </View>
                    ))}
                    {box.equipmentItems.length > 2 && (
                      <View className="bg-slate-100 px-2 py-0.5 rounded-md mb-1">
                        <Text className="text-[9px] font-poppins-semibold text-[#64748b]">
                          +{box.equipmentItems.length - 2} more
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Interactive Box Detail Modal / Sheet */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl max-w-[600px] w-full self-center p-5 max-h-[85%]">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-10 h-10 rounded-2xl bg-[#4d6029] items-center justify-center mr-3">
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={20}
                    color="#ffffff"
                  />
                </View>
                <View>
                  <Text className="text-base font-poppins-bold text-[#0f172a]">
                    {selectedBox?.code}
                  </Text>
                  <Text className="text-xs font-poppins-medium text-[#64748b]">
                    {selectedBox?.tier}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modal Scrollable Specs */}
            <ScrollView className="py-4" showsVerticalScrollIndicator={false}>
              {/* Status & Optical Rating */}
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-[11px] font-poppins-semibold text-[#64748b] uppercase">
                    Status Rating
                  </Text>
                  <View className="mt-1">
                    {selectedBox && getStatusPill(selectedBox.status)}
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[11px] font-poppins-semibold text-[#64748b] uppercase">
                    Optical Level
                  </Text>
                  <Text className="text-base font-poppins-bold text-[#4d6029] mt-0.5">
                    {selectedBox?.opticalLoss}
                  </Text>
                </View>
              </View>

              {/* 4 Technical Metric Cards */}
              <View className="flex-row flex-wrap justify-between mb-4">
                <View className="w-[48%] bg-[#f8fafc] p-3 rounded-xl mb-2.5 border border-slate-100">
                  <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                    Ports Capacity
                  </Text>
                  <Text className="text-sm font-poppins-bold text-[#0f172a] mt-0.5">
                    {selectedBox?.portsUsed} / {selectedBox?.totalPorts} Ports
                  </Text>
                </View>

                <View className="w-[48%] bg-[#f8fafc] p-3 rounded-xl mb-2.5 border border-slate-100">
                  <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                    Operating Voltage
                  </Text>
                  <Text className="text-sm font-poppins-bold text-[#0f172a] mt-0.5">
                    {selectedBox?.voltage || "228.4 V"}
                  </Text>
                </View>

                <View className="w-[48%] bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                    Internal Temperature
                  </Text>
                  <Text className="text-sm font-poppins-bold text-[#0f172a] mt-0.5">
                    {selectedBox?.temperature || "31.2 °C"}
                  </Text>
                </View>

                <View className="w-[48%] bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                    Circuit Breaker
                  </Text>
                  <Text className="text-sm font-poppins-bold text-[#0f172a] mt-0.5">
                    {selectedBox?.circuitBreaker || "63A 2P MCB"}
                  </Text>
                </View>
              </View>

              {/* Installed Hardware Specs */}
              <View className="mb-4">
                <Text className="text-xs font-poppins-bold text-[#0f172a] mb-2 uppercase tracking-wide">
                  Installed Hardware Components
                </Text>
                <View className="bg-[#f8fafc] p-3.5 rounded-xl border border-slate-100">
                  {selectedBox?.equipmentItems.map((item, idx) => (
                    <View key={idx} className="flex-row items-center py-1">
                      <Ionicons
                        name="checkbox-outline"
                        size={14}
                        color="#4d6029"
                      />
                      <Text className="text-xs font-poppins-medium text-[#334155] ml-2">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Quick Actions */}
              <View className="flex-row gap-3 pt-2">
                <TouchableOpacity
                  onPress={() => {
                    setShowDetailModal(false);
                    router.replace("/user/map");
                  }}
                  className="flex-1 bg-slate-100 py-3 rounded-xl items-center justify-center flex-row"
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="map-outline"
                    size={16}
                    color="#0f172a"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-xs font-poppins-bold text-[#0f172a]">
                    Locate on Map
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowDetailModal(false);
                    router.replace("/user/scanner");
                  }}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row"
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={16}
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-xs font-poppins-bold text-white">
                    Scan Box QR
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Steady Bottom Navigation Bar */}
      <UserBottomNavigation activeRoute="/user/boxes" />
    </SafeAreaView>
  );
}
