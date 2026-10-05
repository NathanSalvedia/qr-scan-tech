import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

export default function UserScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [scanned, setScanned] = useState(false);
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
    }, 3000);
  };

  const handleRecognizeCode = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    router.push({
      pathname: '/user/box-details',
      params: { code: cleanCode },
    });
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
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
    }, 2000);
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Permission Loading / Denied State */}
      {!permission ? (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#84cc16" />
          <Text className="text-xs font-poppins-medium text-white/70 mt-3">
            Checking camera permissions...
          </Text>
        </View>
      ) : !permission.granted ? (
        <SafeAreaView className="flex-1 bg-neutral-900 items-center justify-center p-6">
          <View className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 items-center justify-center mb-4">
            <Ionicons name="camera-outline" size={32} color="#f59e0b" />
          </View>
          <Text className="text-lg font-poppins-bold text-white mb-2 text-center">
            Camera Access Required
          </Text>
          <Text className="text-xs font-poppins text-neutral-300 text-center mb-6 max-w-xs">
            MultiFactors needs camera access to scan physical QR code placards on distribution boxes.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-[#4d6029] px-6 py-3.5 rounded-2xl flex-row items-center shadow-lg mb-3"
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color="#ffffff" />
            <Text className="text-xs font-poppins-bold text-white ml-2">
              Grant Camera Permission
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGoBack}
            className="bg-white/10 border border-white/20 px-5 py-2.5 rounded-2xl mt-2"
            activeOpacity={0.7}
          >
            <Text className="text-xs font-poppins-medium text-white/80">
              Go Back
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : (
        /* Full Screen Live Camera View with Overlaid Close Button */
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

          {/* Transparent Overlay with Overlaid Close Button & Reticle */}
          <SafeAreaView className="flex-1 justify-between z-20">
            
            {/* 1. TOP OVERLAY: Floating Close Button */}
            <View className="px-5 pt-2 flex-row items-center justify-start">
              <TouchableOpacity
                onPress={handleGoBack}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/25 items-center justify-center shadow-lg active:bg-black/70"
                accessibilityLabel="Close scanner"
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Floating Toast Notification */}
            {toastMessage && (
              <View className="mx-6 mt-1 bg-[#4d6029] border border-[#3e4e20] px-4 py-2.5 rounded-2xl flex-row items-center justify-between shadow-lg">
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

            {/* 2. CENTER RETICLE & CAMERA CONTROLS */}
            <View className="items-center justify-center">
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
                    {scanned ? 'Opening Box Details...' : 'Align QR inside frame'}
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
                      : 'bg-black/50 border-white/20'
                  }`}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={torchEnabled ? 'flashlight' : 'flashlight-outline'}
                    size={16}
                    color={torchEnabled ? '#0f172a' : '#ffffff'}
                  />
                  <Text
                    className={`text-xs font-poppins-bold ml-1.5 ${
                      torchEnabled ? 'text-[#0f172a]' : 'text-white'
                    }`}
                  >
                    Torch {torchEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                  className="px-4 py-2.5 rounded-2xl flex-row items-center border bg-black/50 border-white/20 shadow-md active:bg-black/70"
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-reverse-outline" size={16} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    Flip
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. BOTTOM QUICK EMULATOR SCAN TRIGGERS */}
            <View className="px-4 pb-4 w-full max-w-sm self-center">
              <View className="bg-black/60 border border-white/15 rounded-2xl p-3 shadow-xl backdrop-blur-md">
                <Text className="text-[11px] font-poppins-bold text-white/90 text-center mb-2">
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

          </SafeAreaView>
        </View>
      )}

    </View>
  );
}
