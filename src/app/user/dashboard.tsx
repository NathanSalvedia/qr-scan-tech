import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { BOX_PINS } from "@/constants/distribution-boxes";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserDashboardScreen() {
  const router = useRouter();
  const [isOnDuty, setIsOnDuty] = useState(true);

  const totalBoxes = BOX_PINS.length;
  const taggedBoxes = BOX_PINS.filter((b) => b.status === "ACTIVE").length;
  const needsTagBoxes = BOX_PINS.filter((b) => b.status === "NEEDS_TAG").length;
  const issueBoxes = BOX_PINS.filter((b) => b.status === "ISSUE").length;

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: isWeb ? 24 : 18,
          paddingTop: 16,
          paddingBottom: 28,
          maxWidth: 600,
          width: "100%",
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-1 pr-3">
            <Text className="text-[11px] font-poppins-semibold tracking-wider text-[#64748b] uppercase">
              MultiFactors Sales
            </Text>
            <Text className="text-1xl font-poppins-bold text-[#0f172a] mt-0.5">
              Good morning, Nathan Salvedia!
            </Text>
          </View>

          {/* On Duty Status Pill */}
          <TouchableOpacity
            onPress={() => setIsOnDuty(!isOnDuty)}
            activeOpacity={0.8}
            className={`flex-row items-center px-3 py-1.5 rounded-full border ${
              isOnDuty
                ? "bg-emerald-50 border-emerald-200"
                : "bg-slate-100 border-slate-300"
            }`}
          >
            <View
              className={`w-2 h-2 rounded-full mr-1.5 ${
                isOnDuty ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            <Text
              className={`text-[11px] font-poppins-semibold ${
                isOnDuty ? "text-emerald-700" : "text-slate-600"
              }`}
            >
              {isOnDuty ? "On Duty" : "Off Duty"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero Quick Scan Card */}
        <View className="bg-[#4d6029] rounded-2xl p-5 mb-6 shadow-md shadow-[#4d6029]/20 relative overflow-hidden">
          {/* Background Decorative Watermark */}
          <View className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={140}
              color="#ffffff"
            />
          </View>

          <View className="flex-row items-center mb-2.5">
            <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center mr-2.5">
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={18}
                color="#ffffff"
              />
            </View>
            <Text className="text-base font-poppins-bold text-white">
              Quick Diagnostic & QR Scan
            </Text>
          </View>

          <Text className="text-xs font-poppins-regular text-white/90 leading-5 mb-4">
            Scan any distribution box to view optical power, ports, and
            connected subscribers.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/user/scanner")}
            className="bg-white rounded-xl py-3 px-4 flex-row items-center justify-center active:scale-[0.98] transition-all shadow-sm"
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons
              name="camera-outline"
              size={18}
              color="#4d6029"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs font-poppins-bold text-[#4d6029]">
              Open QR Scanner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's Summary Section Header */}
        <View className="flex-row items-center justify-between mb-3.5">
          <Text className="text-sm font-poppins-bold text-[#0f172a] uppercase tracking-wider">
            Today{"'"}s Summary
          </Text>
          <Text className="text-[11px] font-poppins-medium text-[#64748b]">
            Live Network Overview
          </Text>
        </View>

        {/* 4 Summary Cards (2x2 Grid) in Requested Order:
            1. All Boxes -> 2. Tagged Box -> 3. Needs Tag -> 4. Issues */}
        <View className="flex-row flex-wrap justify-between mb-6">
          {/* 1. All Boxes */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center">
                <Ionicons name="cube-outline" size={18} color="#334155" />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-slate-500 uppercase tracking-wide">
                Total
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#0f172a]">
              {totalBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#334155] mt-0.5">
              All Boxes
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Network infrastructure
            </Text>
          </View>

          {/* 2. Tagged Box */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#4d6029"
                />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-emerald-700 uppercase tracking-wide">
                Active
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#4d6029]">
              {taggedBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
              Tagged Box
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Verified QR tags
            </Text>
          </View>

          {/* 3. Needs Tag */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                <Ionicons name="pricetag-outline" size={18} color="#d97706" />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-amber-700 uppercase tracking-wide">
                Pending
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#d97706]">
              {needsTagBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
              Needs Tag
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Pending installation
            </Text>
          </View>

          {/* 4. Issues */}
          <View className="w-[48%] bg-white rounded-2xl p-4 mb-3.5 border border-slate-200/80 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center">
                <Ionicons name="warning-outline" size={18} color="#e11d48" />
              </View>
              <Text className="text-[10px] font-poppins-semibold text-rose-700 uppercase tracking-wide">
                Attention
              </Text>
            </View>
            <Text className="text-2xl font-poppins-bold text-[#e11d48]">
              {issueBoxes}
            </Text>
            <Text className="text-xs font-poppins-bold text-[#0f172a] mt-0.5">
              Issues
            </Text>
            <Text className="text-[10px] font-poppins-medium text-[#94a3b8] mt-0.5">
              Requires field audit
            </Text>
          </View>
        </View>

        {/* Recent Scanned Boxes (Clean, Address-free) */}
        <View className="mb-2">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text className="text-sm font-poppins-bold text-[#0f172a] uppercase tracking-wider">
              Recent Scanned Boxes
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/user/boxes")}
              activeOpacity={0.7}
            >
              <Text className="text-xs font-poppins-semibold text-[#4d6029]">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Item 1 */}
          <TouchableOpacity
            onPress={() => router.replace("/user/boxes")}
            className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 flex-row items-center justify-between active:bg-slate-50"
            activeOpacity={0.75}
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mr-3 border border-emerald-100">
                <MaterialCommunityIcons name="cube" size={20} color="#4d6029" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-sm font-poppins-bold text-[#0f172a] mr-2">
                    DB-MB-01
                  </Text>
                  <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-poppins-semibold text-emerald-800">
                      Operational
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5">
                  1:8 Splitter · -18.2 dBm · 15m ago
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          {/* Item 2 */}
          <TouchableOpacity
            onPress={() => router.replace("/user/boxes")}
            className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 flex-row items-center justify-between active:bg-slate-50"
            activeOpacity={0.75}
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-rose-50 items-center justify-center mr-3 border border-rose-100">
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color="#e11d48"
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-sm font-poppins-bold text-[#0f172a] mr-2">
                    DB-SB-03
                  </Text>
                  <View className="bg-rose-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-poppins-semibold text-rose-800">
                      Signal Loss
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5">
                  1:8 Splitter · -24.1 dBm · 1h ago
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          {/* Item 3 */}
          <TouchableOpacity
            onPress={() => router.replace("/user/boxes")}
            className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm shadow-slate-200/40 flex-row items-center justify-between active:bg-slate-50"
            activeOpacity={0.75}
          >
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mr-3 border border-emerald-100">
                <MaterialCommunityIcons name="cube" size={20} color="#4d6029" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-sm font-poppins-bold text-[#0f172a] mr-2">
                    DB-SB-01
                  </Text>
                  <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-poppins-semibold text-emerald-800">
                      Operational
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5">
                  1:4 Splitter · -17.5 dBm · 3h ago
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Steady Bottom Navigation Bar */}
      <UserBottomNavigation activeRoute="/user/dashboard" />
    </SafeAreaView>
  );
}
