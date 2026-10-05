import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { BOX_PINS } from '@/constants/distribution-boxes';

interface SubscriberItem {
  port: number;
  name: string;
  plan: string;
  signal: string;
  status: 'Active' | 'Offline';
}

interface BoxDetailData {
  code: string;
  tier: string;
  status: 'Operational' | 'Warning' | 'Overloaded';
  location: string;
  zone: string;
  gps: string;
  splitterType: string;
  portsUsed: number;
  totalPorts: number;
  opticalLoss: string;
  temperature: string;
  lockStatus: 'Secured' | 'Unlatched' | 'Damaged';
  subscribers: SubscriberItem[];
}

export default function BoxDetailsScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const boxCodeParam = (params.code || 'DB-MN-01').toUpperCase().trim();

  // Audit modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditNotes, setAuditNotes] = useState('');
  const [padlockVerified, setPadlockVerified] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isWeb = Platform.OS === 'web';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const getBoxData = (code: string): BoxDetailData => {
    const upper = code.toUpperCase().trim();
    if (upper === 'DB-SB-03' || upper.includes('SB03') || upper.includes('SB-03')) {
      return {
        code: 'DB-SB-03',
        tier: 'Tier 2 · Sub-Distribution',
        status: 'Warning',
        location: 'Tibanga Highway near MSU-IIT Gate',
        zone: 'Tibanga',
        gps: '8.2412, 124.2440',
        splitterType: '1:16 PLC Cassette Splitter',
        portsUsed: 14,
        totalPorts: 16,
        opticalLoss: '-25.4 dBm (Loss Warning)',
        temperature: '38.4°C',
        lockStatus: 'Secured',
        subscribers: [
          { port: 1, name: 'MSU-IIT Faculty Annex', plan: 'Fiber Biz 200M', signal: '-25.1 dBm', status: 'Active' },
          { port: 2, name: 'Campus Tech Hub', plan: 'Fiber Biz 500M', signal: '-25.4 dBm', status: 'Active' },
          { port: 3, name: 'Student Dorm Block C', plan: 'Fiber Home 100M', signal: '-25.6 dBm', status: 'Active' },
          { port: 4, name: 'Tibanga Net Cafe', plan: 'Fiber Biz 300M', signal: '-25.0 dBm', status: 'Active' },
          { port: 5, name: 'Elena Gomez', plan: 'Fiber Home 50M', signal: '-24.8 dBm', status: 'Active' },
          { port: 6, name: 'Mark Ramos', plan: 'Fiber Home 100M', signal: '-25.2 dBm', status: 'Active' },
          { port: 7, name: 'MSU-IIT Science Laboratory', plan: 'Fiber Enterprise 1G', signal: '-25.5 dBm', status: 'Active' },
          { port: 8, name: 'Dormitory Dining Hall', plan: 'Fiber Biz 100M', signal: '-25.3 dBm', status: 'Active' },
        ],
      };
    } else if (upper === 'DB-SB-06' || upper.includes('SB06') || upper === 'DB-MN-05') {
      return {
        code: 'DB-SB-06',
        tier: 'Tier 1 · Main Feeder',
        status: 'Overloaded',
        location: 'Tubod National Highway / Del Carmen',
        zone: 'Tubod',
        gps: '8.2120, 124.2380',
        splitterType: '1:16 PLC Modular Tray',
        portsUsed: 16,
        totalPorts: 16,
        opticalLoss: '-20.1 dBm (Normal)',
        temperature: '41.2°C',
        lockStatus: 'Secured',
        subscribers: [
          { port: 1, name: 'Tubod Commercial Mart', plan: 'Fiber Biz 500M', signal: '-19.4 dBm', status: 'Active' },
          { port: 2, name: 'Barangay Health Center', plan: 'Fiber Biz 100M', signal: '-20.1 dBm', status: 'Active' },
          { port: 3, name: 'Carlos Mendoza', plan: 'Fiber Home 100M', signal: '-19.8 dBm', status: 'Active' },
          { port: 4, name: 'Lourdes Santos', plan: 'Fiber Home 50M', signal: '-20.4 dBm', status: 'Active' },
          { port: 5, name: 'Tubod Bakery & Cafe', plan: 'Fiber Biz 200M', signal: '-20.2 dBm', status: 'Active' },
          { port: 6, name: 'Del Carmen Hardware', plan: 'Fiber Biz 300M', signal: '-19.9 dBm', status: 'Active' },
        ],
      };
    } else if (upper === 'DB-MN-02' || upper.includes('MN02')) {
      return {
        code: 'DB-MN-02',
        tier: 'Tier 1 · Main Feeder',
        status: 'Operational',
        location: 'Roxas Ave cor. Aguinaldo, Iligan City',
        zone: 'Poblacion',
        gps: '8.2240, 124.2420',
        splitterType: 'Main Optical Feeder 24-Port',
        portsUsed: 21,
        totalPorts: 24,
        opticalLoss: '-18.5 dBm (Optimal)',
        temperature: '33.0°C',
        lockStatus: 'Secured',
        subscribers: [
          { port: 1, name: 'Roxas Commercial Bank', plan: '500 Mbps Dedicated', signal: '-18.2 dBm', status: 'Active' },
          { port: 2, name: 'Poblacion Medical Clinic', plan: '300 Mbps Fiber', signal: '-18.5 dBm', status: 'Active' },
          { port: 3, name: 'Midtown Plaza Office', plan: '200 Mbps Business', signal: '-18.7 dBm', status: 'Active' },
        ],
      };
    } else {
      // Default: DB-MN-01
      const foundBox = BOX_PINS.find((b) => b.code === upper);
      return {
        code: foundBox ? foundBox.code : 'DB-MN-01',
        tier: foundBox ? foundBox.tier : 'Tier 1 · Main Backbone Box',
        status: 'Operational',
        location: foundBox ? foundBox.address : 'Aguinaldo St, Poblacion Commercial Hub',
        zone: foundBox ? foundBox.zone : 'Poblacion',
        gps: foundBox ? `${foundBox.latitude.toFixed(4)}, ${foundBox.longitude.toFixed(4)}` : '8.2285, 124.2415',
        splitterType: '1:16 PLC Cassette Splitter',
        portsUsed: foundBox ? Math.min(foundBox.portsUsed, 14) : 14,
        totalPorts: 16,
        opticalLoss: foundBox ? `${foundBox.opticalLoss} (Optimal)` : '-18.2 dBm (Optimal)',
        temperature: foundBox ? foundBox.temperature : '34.6°C',
        lockStatus: 'Secured',
        subscribers: [
          { port: 1, name: 'Iligan City Public Library', plan: 'Fiber Enterprise 1G', signal: '-17.8 dBm', status: 'Active' },
          { port: 2, name: 'Poblacion Pharmacy', plan: 'Fiber Biz 300M', signal: '-18.1 dBm', status: 'Active' },
          { port: 3, name: 'Aguinaldo Law Offices', plan: 'Fiber Biz 200M', signal: '-18.4 dBm', status: 'Active' },
          { port: 4, name: 'Metro Finance Iligan', plan: 'Fiber Biz 500M', signal: '-17.9 dBm', status: 'Active' },
          { port: 5, name: 'Roberto Tan Residence', plan: 'Fiber Home 100M', signal: '-18.5 dBm', status: 'Active' },
          { port: 6, name: 'Green Cafe Poblacion', plan: 'Fiber Biz 150M', signal: '-18.2 dBm', status: 'Active' },
          { port: 7, name: 'City Dental Clinic', plan: 'Fiber Biz 200M', signal: '-18.0 dBm', status: 'Active' },
          { port: 8, name: 'Aguinaldo Convenience Store', plan: 'Fiber Home 100M', signal: '-18.3 dBm', status: 'Active' },
        ],
      };
    }
  };

  const box = getBoxData(boxCodeParam);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/user/scanner');
    }
  };

  const handleSubmitAudit = () => {
    setIsAuditModalOpen(false);
    setAuditNotes('');
    showToast(`Audit for ${box.code} successfully recorded and synced.`);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#f8fafc]">
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
            <MaterialCommunityIcons name="cube-outline" size={22} color="#ffffff" />
          </View>

          {/* Box Header Info */}
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-lg font-poppins-bold text-white">
                {box.code}
              </Text>
              <View className="bg-white/20 px-2 py-0.5 rounded-md ml-2">
                <Text className="text-[10px] font-poppins-bold text-white">
                  {box.status}
                </Text>
              </View>
            </View>
            <Text className="text-xs font-poppins text-white/80" numberOfLines={1}>
              {box.tier}
            </Text>
          </View>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          onPress={handleGoBack}
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
          accessibilityLabel="Close box details"
        >
          <Ionicons name="close" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Page Body */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="max-w-2xl w-full self-center">

          {/* 1. Location & Telemetry Specs Card */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-start mb-3">
              <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5 mt-0.5">
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

            {/* 4 Telemetry Metrics Grid */}
            <View className="flex-row flex-wrap justify-between gap-y-3 pt-4 border-t border-slate-100 mt-1">
              <View className="w-[48%] sm:w-[23%] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-poppins text-[#64748b]">Optical Signal</Text>
                <Text className="text-xs font-poppins-bold text-[#0f172a] mt-1">{box.opticalLoss}</Text>
              </View>

              <View className="w-[48%] sm:w-[23%] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-poppins text-[#64748b]">Temperature</Text>
                <Text className="text-xs font-poppins-bold text-[#0f172a] mt-1">{box.temperature}</Text>
              </View>

              <View className="w-[48%] sm:w-[23%] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-poppins text-[#64748b]">Padlock Lock</Text>
                <Text className="text-xs font-poppins-bold text-emerald-600 mt-1">{box.lockStatus}</Text>
              </View>

              <View className="w-[48%] sm:w-[23%] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <Text className="text-[10px] font-poppins text-[#64748b]">Port Capacity</Text>
                <Text className="text-xs font-poppins-bold text-[#4d6029] mt-1">
                  {box.portsUsed} / {box.totalPorts}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Splitter Port Matrix */}
          <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-sm shadow-slate-200/50">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-poppins-bold text-[#0f172a]">
                Splitter Port Matrix
              </Text>
              <View className="bg-[#4d6029]/10 px-2.5 py-0.5 rounded-full">
                <Text className="text-[11px] font-poppins-bold text-[#4d6029]">
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
                        ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <Ionicons
                      name="hardware-chip"
                      size={15}
                      color={isOccupied ? '#059669' : '#94a3b8'}
                    />
                    <Text
                      className={`text-[9px] font-poppins-bold mt-0.5 ${
                        isOccupied ? 'text-emerald-800' : 'text-[#94a3b8]'
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
                Connected Subscribers
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
                    <View className="w-8 h-8 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                      <Text className="text-[11px] font-poppins-bold text-emerald-800">
                        P{sub.port}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-poppins-bold text-[#0f172a]" numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <Text className="text-[10px] font-poppins text-[#64748b] mt-0.5">
                        {sub.plan}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs font-mono font-bold text-[#4d6029]">
                    {sub.signal}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Action Buttons */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => setIsAuditModalOpen(true)}
              className="flex-1 bg-[#4d6029] py-4 rounded-2xl flex-row items-center justify-center shadow-md shadow-[#4d6029]/25 active:opacity-90"
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
              <Text className="text-sm font-poppins-bold text-white ml-2">
                Log Routine Audit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (isWeb) {
                  window.open(`https://maps.google.com/?q=${box.location}`, '_blank');
                } else {
                  Alert.alert('Directions', `Navigating to ${box.location}`);
                }
              }}
              className="bg-white py-4 px-5 rounded-2xl flex-row items-center justify-center border border-slate-200 shadow-sm active:bg-slate-50"
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={18} color="#334155" />
              <Text className="text-sm font-poppins-bold text-[#334155] ml-1.5">
                Directions
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Routine Audit Modal Form */}
      <Modal
        visible={isAuditModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAuditModalOpen(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center p-4">
          <View className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <Text className="text-sm font-poppins-bold text-[#0f172a]">
                Record Inspection: {box.code}
              </Text>
              <TouchableOpacity onPress={() => setIsAuditModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setPadlockVerified(!padlockVerified)}
              className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex-row items-center mb-3"
            >
              <Ionicons
                name={padlockVerified ? 'checkbox' : 'square-outline'}
                size={20}
                color={padlockVerified ? '#4d6029' : '#94a3b8'}
              />
              <View className="ml-2.5 flex-1">
                <Text className="text-xs font-poppins-bold text-[#0f172a]">
                  Cabinet Padlock Verified Locked
                </Text>
                <Text className="text-[10px] font-poppins text-[#64748b]">
                  Physical latch sealed &amp; weather-tight
                </Text>
              </View>
            </TouchableOpacity>

            <TextInput
              value={auditNotes}
              onChangeText={setAuditNotes}
              placeholder="Remarks (e.g. Signal -18.2 dBm normal, spliced fiber cleaned)..."
              placeholderTextColor="#94a3b8"
              multiline={true}
              numberOfLines={3}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-poppins text-[#0f172a] h-20 mb-4 text-top"
            />

            <TouchableOpacity
              onPress={handleSubmitAudit}
              className="w-full bg-[#4d6029] py-3.5 rounded-2xl items-center shadow-md active:opacity-80"
            >
              <Text className="text-xs font-poppins-bold text-white">
                Submit Field Audit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
