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
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

interface BoxDetail {
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
  subscribers: { port: number; name: string; plan: string; signal: string; status: 'Active' | 'Offline' }[];
}

export default function UserScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Diagnostic Sheet State
  const [selectedBox, setSelectedBox] = useState<BoxDetail | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  // Routine Audit Form State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditNotes, setAuditNotes] = useState('');
  const [padlockVerified, setPadlockVerified] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/user/dashboard');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const getMockBoxDetail = (code: string): BoxDetail => {
    const upper = (code || '').toUpperCase().trim();
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
        ],
      };
    } else if (upper === 'DB-MN-05' || upper === 'DB-SB-06' || upper.includes('SB06')) {
      return {
        code: upper === 'DB-SB-06' ? 'DB-SB-06' : 'DB-MN-05',
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
        ],
      };
    } else if (upper === 'DB-MN-02' || upper.includes('MN02') || upper.includes('MN-02')) {
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
      return {
        code: upper.startsWith('DB-') ? upper : 'DB-MN-01',
        tier: 'Tier 1 · Main Backbone Box',
        status: 'Operational',
        location: 'Aguinaldo St, Poblacion Commercial Hub',
        zone: 'Poblacion',
        gps: '8.2285, 124.2415',
        splitterType: '1:16 PLC Cassette Splitter',
        portsUsed: 14,
        totalPorts: 16,
        opticalLoss: '-18.2 dBm (Optimal)',
        temperature: '34.6°C',
        lockStatus: 'Secured',
        subscribers: [
          { port: 1, name: 'Iligan City Public Library', plan: 'Fiber Enterprise 1G', signal: '-17.8 dBm', status: 'Active' },
          { port: 2, name: 'Poblacion Pharmacy', plan: 'Fiber Biz 300M', signal: '-18.1 dBm', status: 'Active' },
          { port: 3, name: 'Aguinaldo Law Offices', plan: 'Fiber Biz 200M', signal: '-18.4 dBm', status: 'Active' },
          { port: 4, name: 'Metro Finance Iligan', plan: 'Fiber Biz 500M', signal: '-17.9 dBm', status: 'Active' },
          { port: 5, name: 'Roberto Tan Residence', plan: 'Fiber Home 100M', signal: '-18.5 dBm', status: 'Active' },
          { port: 6, name: 'Green Cafe Poblacion', plan: 'Fiber Biz 150M', signal: '-18.2 dBm', status: 'Active' },
        ],
      };
    }
  };

  const handleRecognizeCode = (code: string) => {
    const box = getMockBoxDetail(code);
    setSelectedBox(box);
    setIsDiagnosticOpen(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || isDiagnosticOpen) return;
    setScanned(true);

    const rawData = result.data || '';
    let boxCode = 'DB-MN-01';

    // Parse DB-MN-xx or DB-SB-xx from scanned payload
    const match = rawData.match(/DB-(?:MN|SB)-\d+/i);
    if (match) {
      boxCode = match[0].toUpperCase();
    } else if (rawData.toUpperCase().includes('MN01') || rawData.toUpperCase().includes('MN-01')) {
      boxCode = 'DB-MN-01';
    } else if (rawData.toUpperCase().includes('SB03') || rawData.toUpperCase().includes('SB-03')) {
      boxCode = 'DB-SB-03';
    } else if (rawData.toUpperCase().includes('MN02') || rawData.toUpperCase().includes('MN-02')) {
      boxCode = 'DB-MN-02';
    } else if (rawData.toUpperCase().includes('SB02') || rawData.toUpperCase().includes('SB-02')) {
      boxCode = 'DB-SB-02';
    } else if (rawData.toUpperCase().includes('SB04') || rawData.toUpperCase().includes('SB-04')) {
      boxCode = 'DB-SB-04';
    } else if (rawData.toUpperCase().includes('SB05') || rawData.toUpperCase().includes('SB-05')) {
      boxCode = 'DB-SB-05';
    } else if (rawData.toUpperCase().includes('SB06') || rawData.toUpperCase().includes('SB-06')) {
      boxCode = 'DB-SB-06';
    } else if (rawData.trim().length > 0) {
      boxCode = rawData.trim().toUpperCase();
    }

    showToast(`QR Code Scanned: ${boxCode}`);
    handleRecognizeCode(boxCode);

    setTimeout(() => {
      setScanned(false);
    }, 3000);
  };

  const handleSubmitAudit = () => {
    if (!selectedBox) return;
    setIsAuditModalOpen(false);
    setIsDiagnosticOpen(false);
    setAuditNotes('');
    showToast(`Audit for ${selectedBox.code} logged and synced.`);
  };

  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="flex-1 flex-col h-full justify-between relative bg-white">
        
        {/* 1. TOP SCANNER HEADER */}
        <View className="px-5 py-4 flex-row items-center justify-between border-b border-slate-200/90 bg-white z-30">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleGoBack}
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 items-center justify-center mr-3 shadow-xs active:bg-slate-100"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={18} color="#0f172a" />
            </TouchableOpacity>
            <View className="w-8 h-8 rounded-xl bg-[#4d6029] items-center justify-center mr-2.5 shadow-xs">
              <MaterialCommunityIcons name="qrcode-scan" size={16} color="#ffffff" />
            </View>
            <View>
              <Text className="text-sm font-poppins-bold text-[#0f172a]">
                Camera QR Scanner
              </Text>
              <Text className="text-[10px] font-poppins text-[#64748b]">
                MultiFactors Distribution Box Inspector
              </Text>
            </View>
          </View>

          {/* Mode Switcher */}
          <TouchableOpacity
            onPress={() => setIsCameraActive(!isCameraActive)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex-row items-center shadow-xs active:bg-slate-100"
          >
            <Ionicons
              name={isCameraActive ? 'keypad-outline' : 'camera-outline'}
              size={15}
              color="#475569"
            />
            <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
              {isCameraActive ? 'Manual Code' : 'Camera'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <View className="mx-6 mt-3 bg-[#4d6029] border border-[#3e4e20] px-4 py-2.5 rounded-2xl flex-row items-center justify-between shadow-lg z-40">
            <View className="flex-row items-center flex-1 mr-2">
              <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
              <Text className="text-xs font-poppins-bold text-white ml-2 flex-1">
                {toastMessage}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setToastMessage(null)}>
              <Ionicons name="close" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* 2. MAIN CAMERA VIEWFINDER / MANUAL SEARCH */}
        <View className="flex-1 items-center justify-center relative overflow-hidden bg-white">
          {isCameraActive ? (
            <View className="w-full h-full relative items-center justify-center bg-black">
              {/* Permission Check / CameraView */}
              {!permission ? (
                <View className="items-center justify-center bg-white w-full h-full">
                  <ActivityIndicator size="large" color="#4d6029" />
                  <Text className="text-xs font-poppins-medium text-[#64748b] mt-3">
                    Checking camera permissions...
                  </Text>
                </View>
              ) : !permission.granted ? (
                /* Permission Request View */
                <View className="items-center justify-center p-6 text-center max-w-sm bg-white w-full h-full">
                  <View className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 items-center justify-center mb-4">
                    <Ionicons name="camera-outline" size={32} color="#f59e0b" />
                  </View>
                  <Text className="text-base font-poppins-bold text-[#0f172a] mb-2 text-center">
                    Camera Access Required
                  </Text>
                  <Text className="text-xs font-poppins text-[#64748b] text-center mb-6">
                    MultiFactors needs camera access to scan physical QR code placards on distribution boxes.
                  </Text>
                  <TouchableOpacity
                    onPress={requestPermission}
                    className="bg-[#4d6029] px-6 py-3 rounded-2xl flex-row items-center shadow-md mb-3"
                  >
                    <Ionicons name="shield-checkmark-outline" size={16} color="#ffffff" />
                    <Text className="text-xs font-poppins-bold text-white ml-2">
                      Grant Camera Permission
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsCameraActive(false)}
                    className="bg-slate-100 border border-slate-200 px-5 py-2.5 rounded-2xl"
                  >
                    <Text className="text-xs font-poppins-medium text-[#334155]">
                      Use Manual Box Code
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Live Camera Component */
                <View style={StyleSheet.absoluteFill} className="w-full h-full relative">
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing={facing}
                    enableTorch={torchEnabled}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />

                  {/* Darkened Viewfinder Overlay with Transparent Center Cutout */}
                  <View className="absolute inset-0 items-center justify-center bg-black/40">
                    {/* Viewfinder Reticle Frame */}
                    <View className="w-72 h-72 border-2 border-[#4d6029]/80 rounded-3xl relative items-center justify-center shadow-2xl bg-transparent">
                      {/* 4 Corner Crosshairs */}
                      <View className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-[#84cc16] rounded-tl-xl" />
                      <View className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-[#84cc16] rounded-tr-xl" />
                      <View className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-[#84cc16] rounded-bl-xl" />
                      <View className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-[#84cc16] rounded-br-xl" />

                      {/* Laser Sweep Line */}
                      <View className="w-full h-0.5 bg-[#84cc16] shadow-lg shadow-[#84cc16] absolute" />

                      {/* Scanning Prompt Badge */}
                      <View className="bg-white/95 px-3.5 py-1.5 rounded-full border border-slate-200 shadow-md flex-row items-center absolute bottom-4">
                        <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                        <Text className="text-[11px] font-poppins-semibold text-[#0f172a]">
                          {scanned ? 'Processing Code...' : 'Align QR inside frame'}
                        </Text>
                      </View>
                    </View>

                    {/* Camera Control Floating Pill (Torch & Flip) */}
                    <View className="flex-row items-center gap-3 mt-6">
                      <TouchableOpacity
                        onPress={() => setTorchEnabled(!torchEnabled)}
                        className={`px-4 py-2.5 rounded-2xl flex-row items-center border shadow-md ${
                          torchEnabled
                            ? 'bg-amber-400 border-amber-300'
                            : 'bg-white/95 border-slate-200'
                        }`}
                      >
                        <Ionicons
                          name={torchEnabled ? 'flashlight' : 'flashlight-outline'}
                          size={16}
                          color="#0f172a"
                        />
                        <Text
                          className={`text-xs font-poppins-bold ml-1.5 ${
                            torchEnabled ? 'text-[#0f172a]' : 'text-[#334155]'
                          }`}
                        >
                          Torch {torchEnabled ? 'ON' : 'OFF'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                        className="px-4 py-2.5 rounded-2xl flex-row items-center border bg-white/95 border-slate-200 shadow-md active:bg-slate-50"
                      >
                        <Ionicons name="camera-reverse-outline" size={16} color="#334155" />
                        <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                          Flip
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Simulator Quick Testing Codes (Convenient for Emulator testing) */}
                    <View className="absolute bottom-6 px-4 w-full max-w-sm">
                      <View className="bg-white/90 border border-slate-200/90 rounded-2xl p-3 shadow-lg">
                        <Text className="text-[11px] font-poppins-bold text-[#0f172a] text-center mb-2">
                          Quick Emulator Scan Triggers:
                        </Text>
                        <View className="flex-row gap-2 w-full">
                          <TouchableOpacity
                            onPress={() => handleRecognizeCode('DB-MN-01')}
                            className="flex-1 bg-[#4d6029] py-2 rounded-xl items-center shadow-xs active:opacity-80"
                          >
                            <Text className="text-[11px] font-poppins-bold text-white">
                              DB-MN-01
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleRecognizeCode('DB-SB-03')}
                            className="flex-1 bg-amber-600 py-2 rounded-xl items-center shadow-xs active:opacity-80"
                          >
                            <Text className="text-[11px] font-poppins-bold text-white">
                              DB-SB-03
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleRecognizeCode('DB-SB-06')}
                            className="flex-1 bg-rose-600 py-2 rounded-xl items-center shadow-xs active:opacity-80"
                          >
                            <Text className="text-[11px] font-poppins-bold text-white">
                              DB-SB-06
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* Manual Box Search Screen */
            <View className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl">
              <Text className="text-sm font-poppins-bold text-[#0f172a] mb-1">
                Manual Box Search
              </Text>
              <Text className="text-xs font-poppins text-[#64748b] mb-4">
                Enter the box identifier printed beneath the QR code:
              </Text>

              <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex-row items-center mb-4">
                <MaterialCommunityIcons name="pound" size={18} color="#4d6029" />
                <TextInput
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="e.g. DB-MN-01, DB-SB-03"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  className="flex-1 ml-2 text-sm font-mono font-bold text-[#0f172a]"
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (!manualCode.trim()) {
                    Alert.alert('Required', 'Please enter a box identifier.');
                    return;
                  }
                  handleRecognizeCode(manualCode.trim().toUpperCase());
                }}
                className="w-full bg-[#4d6029] py-3.5 rounded-2xl items-center shadow-md mb-2 active:opacity-80"
              >
                <Text className="text-xs font-poppins-bold text-white">
                  Inspect Box Telemetry
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 3. DIAGNOSTIC SHEET MODAL */}
        {selectedBox && (
          <Modal
            visible={isDiagnosticOpen}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsDiagnosticOpen(false)}
          >
            <View className="flex-1 bg-black/60 justify-end md:justify-center items-center p-0 md:p-4">
              <View className="bg-white w-full max-w-2xl max-h-[90vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex-col overflow-hidden">
                
                {/* Modal Header */}
                <View className="bg-[#4d6029] p-5 flex-row items-center justify-between text-white">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mr-3 border border-white/30">
                      <MaterialCommunityIcons name="cube-outline" size={20} color="#ffffff" />
                    </View>
                    <View>
                      <View className="flex-row items-center">
                        <Text className="text-lg font-poppins-bold text-white">
                          {selectedBox.code}
                        </Text>
                        <View className="bg-white/20 px-2 py-0.5 rounded-md ml-2">
                          <Text className="text-[10px] font-poppins-bold text-white">
                            {selectedBox.status}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs font-poppins text-white/80">
                        {selectedBox.tier}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => setIsDiagnosticOpen(false)}>
                    <Ionicons name="close-circle" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Modal Body */}
                <ScrollView className="p-5 flex-1" showsVerticalScrollIndicator={false}>
                  
                  {/* Location specs */}
                  <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                    <View className="flex-row items-start mb-2">
                      <Ionicons name="location" size={16} color="#4d6029" className="mt-0.5" />
                      <View className="ml-2 flex-1">
                        <Text className="text-xs font-poppins-bold text-[#0f172a]">
                          {selectedBox.location}
                        </Text>
                        <Text className="text-[11px] font-poppins text-[#64748b]">
                          Zone: {selectedBox.zone} · GPS: {selectedBox.gps}
                        </Text>
                      </View>
                    </View>

                    <View className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200 mt-2">
                      <View>
                        <Text className="text-[10px] font-poppins text-[#64748b]">Optical Signal</Text>
                        <Text className="text-xs font-poppins-bold text-[#0f172a]">{selectedBox.opticalLoss}</Text>
                      </View>
                      <View>
                        <Text className="text-[10px] font-poppins text-[#64748b]">Temperature</Text>
                        <Text className="text-xs font-poppins-bold text-[#0f172a]">{selectedBox.temperature}</Text>
                      </View>
                      <View>
                        <Text className="text-[10px] font-poppins text-[#64748b]">Padlock Lock</Text>
                        <Text className="text-xs font-poppins-bold text-emerald-600">{selectedBox.lockStatus}</Text>
                      </View>
                      <View>
                        <Text className="text-[10px] font-poppins text-[#64748b]">Port Capacity</Text>
                        <Text className="text-xs font-poppins-bold text-[#4d6029]">{selectedBox.portsUsed} / {selectedBox.totalPorts}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Port Matrix */}
                  <View className="mb-4">
                    <Text className="text-xs font-poppins-bold text-[#0f172a] mb-2">
                      Splitter Port Matrix ({selectedBox.portsUsed}/{selectedBox.totalPorts} Used)
                    </Text>
                    <View className="grid grid-cols-8 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      {Array.from({ length: selectedBox.totalPorts }).map((_, i) => {
                        const portNum = i + 1;
                        const isOccupied = portNum <= selectedBox.portsUsed;
                        return (
                          <View
                            key={portNum}
                            className={`p-2 rounded-xl items-center justify-center border ${
                              isOccupied
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <Ionicons
                              name="hardware-chip"
                              size={14}
                              color={isOccupied ? '#059669' : '#94a3b8'}
                            />
                            <Text
                              className={`text-[10px] font-poppins-bold mt-0.5 ${
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

                  {/* Connected Subscribers */}
                  <View className="mb-4">
                    <Text className="text-xs font-poppins-bold text-[#0f172a] mb-2">
                      Connected Subscribers
                    </Text>
                    <View className="space-y-2">
                      {selectedBox.subscribers.map((sub) => (
                        <View
                          key={sub.port}
                          className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center">
                            <View className="w-6 h-6 rounded-lg bg-emerald-100 items-center justify-center mr-2.5">
                              <Text className="text-[10px] font-poppins-bold text-emerald-800">
                                P{sub.port}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-xs font-poppins-bold text-[#0f172a]">
                                {sub.name}
                              </Text>
                              <Text className="text-[10px] font-poppins text-[#64748b]">
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

                  {/* Action Buttons */}
                  <View className="flex-row gap-3 pt-2">
                    <TouchableOpacity
                      onPress={() => setIsAuditModalOpen(true)}
                      className="flex-1 bg-[#4d6029] py-3 rounded-2xl flex-row items-center justify-center shadow-md active:opacity-80"
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" />
                      <Text className="text-xs font-poppins-bold text-white ml-2">
                        Log Routine Audit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        if (isWeb) {
                          window.open(`https://maps.google.com/?q=${selectedBox.location}`, '_blank');
                        } else {
                          Alert.alert('Directions', `Navigating to ${selectedBox.location}`);
                        }
                      }}
                      className="bg-slate-100 py-3 px-4 rounded-2xl flex-row items-center justify-center border border-slate-200 active:opacity-80"
                    >
                      <Ionicons name="navigate-outline" size={16} color="#334155" />
                      <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                        Directions
                      </Text>
                    </TouchableOpacity>
                  </View>

                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* 4. AUDIT CHECK-IN MODAL */}
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
                  Record Inspection: {selectedBox?.code}
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

      </View>
    </SafeAreaView>
  );
}
