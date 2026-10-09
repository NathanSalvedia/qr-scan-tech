import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { boxService, DistributionBox } from '@/services/boxes';
import { logsService } from '@/services/logs';
import { settingsService } from '@/services/settings';
import { playScanConfirmationBeep } from '@/services/sound';

export default function UserScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  // Scanning & processing state
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic boxes cache from database
  const [boxes, setBoxes] = useState<DistributionBox[]>([]);

  // Dynamic Simulate Box Scan Modal state
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simulateSearch, setSimulateSearch] = useState('');
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Tag affixing confirmation modal (for boxes with NEEDS_TAG status)
  const [tagModalBox, setTagModalBox] = useState<DistributionBox | null>(null);
  const [isUpdatingTag, setIsUpdatingTag] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function initBoxes() {
      try {
        const prefs = await settingsService.getScannerPreferences();
        if (isMounted && prefs.autoFlashlight) {
          setTorchEnabled(true);
        }

        const res = await boxService.getAll();
        if (!isMounted) return;
        if (res.success && Array.isArray(res.boxes)) {
          setBoxes(res.boxes);
          await settingsService.saveOfflineBoxes(res.boxes);
        } else {
          const offline = await settingsService.getOfflineBoxes();
          if (offline.length > 0) setBoxes(offline);
        }
      } catch (err) {
        console.error('Failed to initialize boxes for scanner:', err);
        const offline = await settingsService.getOfflineBoxes();
        if (offline.length > 0 && isMounted) setBoxes(offline);
      }
    }
    initBoxes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync autoFlashlight preference on screen focus
  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      settingsService.getScannerPreferences().then((prefs) => {
        if (isCurrent && prefs.autoFlashlight) {
          setTorchEnabled(true);
        }
      });
      return () => {
        isCurrent = false;
      };
    }, [])
  );

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/user/dashboard');
    }
  };

  /**
   * Universal QR Payload Parser:
   * Extracts clean Box Code or QR Token from URLs, raw codes, or cryptographic placards
   */
  const extractBoxIdentifier = (rawData: string): string => {
    const trimmed = rawData.trim();
    if (!trimmed) return '';

    // 1. If payload is a deep link URL (e.g. https://domain.com/box/DB-MN-01 or ...?code=DB-MN-01)
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('://')) {
        const url = new URL(trimmed);
        const codeParam =
          url.searchParams.get('code') ||
          url.searchParams.get('token') ||
          url.searchParams.get('id');
        if (codeParam) return codeParam.trim();
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart) return lastPart.trim();
        }
      }
    } catch {
      // Continue to token and regex patterns
    }

    // 2. Cryptographic token format: QRTECH-BOX-DB-MN-01-xxxx or QRTECH-BOX-DB-MN-01
    const tokenMatch = trimmed.match(/QRTECH-BOX-([A-Z0-9-]+)/i);
    if (tokenMatch) {
      return trimmed;
    }

    // 3. Regex for standard box code: DB-MN-xx, DB-SB-xx, or custom prefix
    const codeMatch = trimmed.match(/DB-[A-Z0-9-]+/i);
    if (codeMatch) {
      return codeMatch[0].toUpperCase();
    }

    return trimmed;
  };

  /**
   * Find matching box in local array by code, qrToken, or UUID id
   */
  const findBoxInList = (identifier: string, boxList: DistributionBox[]): DistributionBox | undefined => {
    const clean = identifier.trim().toUpperCase();
    return boxList.find((b) => {
      const bCode = (b.code || '').trim().toUpperCase();
      const bToken = (b.qrToken || '').trim().toUpperCase();
      const bId = (b.id || '').trim().toUpperCase();

      if (bCode === clean) return true;
      if (bToken === clean) return true;
      if (bId === clean) return true;
      if (bToken && clean.includes(bCode)) return true;
      if (bToken && bToken.includes(clean)) return true;
      return false;
    });
  };

  /**
   * Core verification & submission routine
   */
  const processBoxScan = async (rawData: string, scanType = 'CAMERA_QR') => {
    if (scanned || isProcessing) return;
    setScanned(true);
    setIsProcessing(true);

    const identifier = extractBoxIdentifier(rawData);

    // 1. Search in local cached boxes
    let matchedBox = findBoxInList(identifier, boxes);

    // 2. If not found in memory, attempt live backend query
    if (!matchedBox) {
      try {
        const directRes = await boxService.getById(identifier);
        if (directRes.success && directRes.box) {
          matchedBox = directRes.box;
          setBoxes((prev) => [directRes.box, ...prev.filter((b) => b.id !== directRes.box.id)]);
        } else {
          // Re-fetch all boxes to sync newly created nodes
          const freshRes = await boxService.getAll();
          if (freshRes.success && Array.isArray(freshRes.boxes)) {
            setBoxes(freshRes.boxes);
            matchedBox = findBoxInList(identifier, freshRes.boxes);
          }
        }
      } catch (err) {
        console.error('Error querying box during scan:', err);
      }
    }

    // 3. If box does NOT exist in network database
    if (!matchedBox) {
      setIsProcessing(false);
      showToast(`Unregistered Box: "${identifier || rawData}" not found in database`, 'error');
      setTimeout(() => {
        setScanned(false);
      }, 2500);
      return;
    }

    // 4. Box found & verified!
    showToast(`Verified: ${matchedBox.code} · ${matchedBox.siteName}`, 'success');

    // Trigger haptic pulse and/or audio beep based on scanner preferences
    settingsService.getScannerPreferences().then((prefs) => {
      if (prefs.vibrateOnScan) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(120);
          } catch {
            // Ignore web vibration error
          }
        }
      }
      if (prefs.beepOnScan) {
        playScanConfirmationBeep();
      }
    });

    // If box has NEEDS_TAG status, offer physical placard confirmation
    if (matchedBox.status === 'NEEDS_TAG') {
      setIsProcessing(false);
      setTagModalBox(matchedBox);
      return;
    }

    // Standard flow for ACTIVE or ISSUE boxes: record scan & navigate
    await executeScanAuditAndNavigate(matchedBox, scanType);
  };

  /**
   * Record scan audit in database and navigate to details screen
   */
  const executeScanAuditAndNavigate = async (
    box: DistributionBox,
    scanType = 'CAMERA_QR',
    overrideStatus?: string
  ) => {
    try {
      const finalStatus = overrideStatus || box.status;
      await logsService.recordScan({
        boxId: box.id,
        boxCode: box.code,
        scanType,
        padlockVerified: true,
        boxStatusAtScan: finalStatus,
        measuredSignal: (box as any).opticalLoss || undefined,
        measuredTemp: (box as any).temperature || undefined,
        auditNotes:
          scanType === 'CAMERA_QR'
            ? `Field audit scan of ${box.code} at ${box.siteName}`
            : `Simulated scan test of ${box.code} via dynamic box picker`,
      });
    } catch (err) {
      console.error('Failed to submit scan audit log:', err);
    } finally {
      setIsProcessing(false);
      router.push({
        pathname: '/user/box-details',
        params: { code: box.code, id: box.id },
      });
      setTimeout(() => {
        setScanned(false);
      }, 1500);
    }
  };

  /**
   * Confirm physical tag affixing for NEEDS_TAG box
   */
  const handleConfirmTagAffixed = async () => {
    if (!tagModalBox) return;
    try {
      setIsUpdatingTag(true);
      // 1. Update box status to ACTIVE in database
      await boxService.update(tagModalBox.id, { status: 'ACTIVE' });

      // 2. Update local state
      setBoxes((prev) =>
        prev.map((b) => (b.id === tagModalBox.id ? { ...b, status: 'ACTIVE' } : b))
      );

      // 3. Record audit log & navigate
      const updatedBox = { ...tagModalBox, status: 'ACTIVE' as const };
      setTagModalBox(null);
      await executeScanAuditAndNavigate(updatedBox, 'CAMERA_QR', 'ACTIVE');
    } catch (err) {
      console.error('Failed to affix tag:', err);
      showToast('Failed to update box status', 'error');
    } finally {
      setIsUpdatingTag(false);
    }
  };

  /**
   * Keep status as NEEDS_TAG and proceed
   */
  const handleProceedWithoutAffix = async () => {
    if (!tagModalBox) return;
    const currentBox = tagModalBox;
    setTagModalBox(null);
    await executeScanAuditAndNavigate(currentBox, 'CAMERA_QR', 'NEEDS_TAG');
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || isProcessing) return;
    processBoxScan(result.data || '', 'CAMERA_QR');
  };

  const handleSimulateSelect = (boxCode: string) => {
    setIsSimulateModalOpen(false);
    setTimeout(() => {
      processBoxScan(boxCode, 'SIMULATED_SCAN');
    }, 250);
  };

  const handleManualCodeSubmit = () => {
    if (!manualCodeInput.trim()) return;
    const code = manualCodeInput.trim();
    setManualCodeInput('');
    setIsSimulateModalOpen(false);
    setTimeout(() => {
      processBoxScan(code, 'SIMULATED_SCAN');
    }, 250);
  };

  const getSimulateStatusPill = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          dot: 'bg-emerald-500',
          label: 'Active',
        };
      case 'NEEDS_TAG':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          dot: 'bg-amber-500',
          label: 'Needs Tag',
        };
      case 'ISSUE':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-700',
          dot: 'bg-rose-500',
          label: 'Issue',
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-700',
          dot: 'bg-slate-500',
          label: status,
        };
    }
  };

  // Filter boxes for simulate modal
  const filteredSimulateBoxes = boxes.filter((b) => {
    if (!simulateSearch.trim()) return true;
    const q = simulateSearch.toLowerCase().trim();
    return (
      (b.code || '').toLowerCase().includes(q) ||
      (b.siteName || '').toLowerCase().includes(q) ||
      (b.address || '').toLowerCase().includes(q) ||
      (b.zone || '').toLowerCase().includes(q)
    );
  });

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
            onBarcodeScanned={scanned || isProcessing ? undefined : handleBarcodeScanned}
          />

          {/* Transparent Overlay with Overlaid Close Button & Reticle */}
          <SafeAreaView className="flex-1 justify-between z-20">
            {/* 1. TOP OVERLAY: Floating Close Button & Live Status */}
            <View className="px-5 pt-2 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={handleGoBack}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/25 items-center justify-center shadow-lg active:bg-black/70"
                accessibilityLabel="Close scanner"
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>

              <View className="bg-black/50 border border-white/20 px-3 py-1.5 rounded-full flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                <Text className="text-[10px] font-poppins-semibold text-white/90">
                  Live Scanner
                </Text>
              </View>
            </View>

            {/* Floating Toast Notification */}
            {toastMessage && (
              <View
                className={`mx-6 mt-1 px-4 py-2.5 rounded-2xl flex-row items-center justify-between shadow-lg border ${
                  toastType === 'error'
                    ? 'bg-rose-900/90 border-rose-500'
                    : toastType === 'success'
                    ? 'bg-[#4d6029] border-[#3e4e20]'
                    : 'bg-slate-900/90 border-slate-600'
                }`}
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons
                    name={
                      toastType === 'error'
                        ? 'alert-circle'
                        : toastType === 'success'
                        ? 'checkmark-circle'
                        : 'information-circle'
                    }
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
                  {isProcessing ? (
                    <>
                      <ActivityIndicator size="small" color="#4d6029" style={{ marginRight: 6 }} />
                      <Text className="text-[11px] font-poppins-semibold text-[#0f172a]">
                        Verifying Network Database...
                      </Text>
                    </>
                  ) : (
                    <>
                      <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                      <Text className="text-[11px] font-poppins-semibold text-[#0f172a]">
                        {scanned ? 'Opening Box Details...' : 'Align QR inside frame'}
                      </Text>
                    </>
                  )}
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

            {/* 3. BOTTOM CONTROLS & DYNAMIC SIMULATE BOX BUTTON */}
            <View className="pb-6 items-center px-6 w-full max-w-sm self-center">
              <TouchableOpacity
                onPress={() => setIsSimulateModalOpen(true)}
                className="bg-black/65 border border-white/25 px-5 py-2.5 rounded-2xl flex-row items-center shadow-lg active:bg-black/85 mb-2"
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="cube-scan" size={17} color="#84cc16" />
                <Text className="text-xs font-poppins-bold text-white ml-2">
                  Simulate Box Scan
                </Text>
                <View className="ml-2 px-1.5 py-0.5 rounded-md bg-[#84cc16]/20 border border-[#84cc16]/40">
                  <Text className="text-[9px] font-poppins-bold text-lime-400">
                    DYNAMIC
                  </Text>
                </View>
              </TouchableOpacity>

              <Text className="text-[10px] font-poppins text-white/50 text-center tracking-wide">
                Point camera at physical QR sticker, or tap above to simulate a live box scan
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* 4. MODAL: PHYSICAL TAG AFFIXING VERIFICATION (For NEEDS_TAG boxes) */}
      <Modal
        visible={Boolean(tagModalBox)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setTagModalBox(null);
          setScanned(false);
        }}
      >
        <View className="flex-1 bg-black/75 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <View className="w-12 h-12 rounded-2xl bg-amber-100 items-center justify-center mb-3">
              <MaterialCommunityIcons name="qrcode-scan" size={26} color="#d97706" />
            </View>

            <Text className="text-base font-poppins-bold text-[#0f172a]">
              Physical QR Placard Detected
            </Text>
            <Text className="text-xs font-poppins text-[#64748b] mt-1 mb-3">
              Distribution box{' '}
              <Text className="font-mono font-bold text-[#0f172a]">
                {tagModalBox?.code}
              </Text>{' '}
              was awaiting on-site physical tag affixing.
            </Text>

            {/* Box summary pill */}
            <View className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-poppins-bold text-[#0f172a]">
                  {tagModalBox?.siteName}
                </Text>
                <View className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300">
                  <Text className="text-[9px] font-poppins-bold text-amber-800">
                    PENDING TAG
                  </Text>
                </View>
              </View>
              <Text className="text-[11px] font-poppins text-[#64748b]">
                {tagModalBox?.address}
              </Text>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              onPress={handleConfirmTagAffixed}
              disabled={isUpdatingTag}
              className="bg-[#4d6029] py-3 rounded-xl flex-row items-center justify-center shadow-md active:opacity-90 mb-2.5"
            >
              {isUpdatingTag ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-2">
                    Affix Tag & Activate Box
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleProceedWithoutAffix}
              disabled={isUpdatingTag}
              className="bg-slate-100 border border-slate-200 py-2.5 rounded-xl items-center justify-center active:opacity-85 mb-2"
            >
              <Text className="text-xs font-poppins-medium text-[#475569]">
                Inspect Without Tagging
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTagModalBox(null);
                setScanned(false);
              }}
              disabled={isUpdatingTag}
              className="py-1.5 items-center"
            >
              <Text className="text-xs font-poppins text-[#94a3b8]">
                Cancel Scan
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 5. MODAL: DYNAMIC BOX SCAN SIMULATOR */}
      <Modal
        visible={isSimulateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSimulateModalOpen(false)}
      >
        <View className="flex-1 bg-black/75 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] p-5 shadow-2xl border-t border-slate-200">
            {/* Drag Handle */}
            <View className="w-12 h-1 bg-slate-300 rounded-full self-center mb-3" />

            {/* Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <MaterialCommunityIcons name="cube-scan" size={20} color="#4d6029" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-poppins-bold text-[#0f172a]">
                    Simulate QR Scan
                  </Text>
                  <Text className="text-[11px] font-poppins text-[#64748b]">
                    Live PostgreSQL Distribution Boxes ({boxes.length})
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsSimulateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Search Filter */}
            <View className="bg-slate-100 rounded-2xl px-3.5 py-2.5 flex-row items-center mb-2.5 border border-slate-200/80">
              <Ionicons name="search" size={16} color="#64748b" />
              <TextInput
                placeholder="Search box code, site name, or zone..."
                placeholderTextColor="#94a3b8"
                value={simulateSearch}
                onChangeText={setSimulateSearch}
                className="flex-1 ml-2 text-xs font-poppins text-[#0f172a]"
              />
              {simulateSearch.length > 0 && (
                <TouchableOpacity onPress={() => setSimulateSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Manual Code / Token Entry */}
            <View className="bg-slate-50 border border-slate-200 rounded-2xl p-2 mb-3 flex-row items-center">
              <TextInput
                placeholder="Or enter custom code / token..."
                placeholderTextColor="#94a3b8"
                value={manualCodeInput}
                onChangeText={setManualCodeInput}
                className="flex-1 px-2.5 text-xs font-mono text-[#0f172a]"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={handleManualCodeSubmit}
                disabled={!manualCodeInput.trim()}
                className={`px-3 py-2 rounded-xl flex-row items-center ${
                  manualCodeInput.trim() ? 'bg-[#4d6029]' : 'bg-slate-300'
                }`}
              >
                <Ionicons name="scan" size={13} color="#ffffff" />
                <Text className="text-[11px] font-poppins-bold text-white ml-1">
                  Test
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Box List */}
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
              {filteredSimulateBoxes.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <Ionicons name="cube-outline" size={32} color="#94a3b8" />
                  <Text className="text-xs font-poppins-bold text-[#0f172a] mt-2">
                    No matching distribution boxes
                  </Text>
                  <Text className="text-[11px] font-poppins text-[#64748b] text-center mt-0.5">
                    {`No boxes found matching "${simulateSearch}".`}
                  </Text>
                </View>
              ) : (
                filteredSimulateBoxes.map((item) => {
                  const statusPill = getSimulateStatusPill(item.status);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSimulateSelect(item.code)}
                      className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between active:bg-slate-100"
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        <View className="w-10 h-10 rounded-xl bg-white border border-slate-200 items-center justify-center mr-3 shadow-xs">
                          <MaterialCommunityIcons
                            name="qrcode"
                            size={20}
                            color="#4d6029"
                          />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-sm font-mono font-bold text-[#0f172a]">
                              {item.code}
                            </Text>
                            <View className="px-1.5 py-0.5 rounded bg-slate-200">
                              <Text className="text-[9px] font-poppins-bold text-[#475569]">
                                {item.category === 'MAIN_BOX' ? 'MAIN' : 'SUB'}
                              </Text>
                            </View>
                          </View>
                          <Text
                            className="text-xs font-poppins text-[#475569] mt-0.5"
                            numberOfLines={1}
                          >
                            {item.siteName}
                          </Text>
                          <Text className="text-[10px] font-poppins text-[#94a3b8]">
                            Zone: {item.zone || 'Iligan'} · Ports: {item.portsUsed || 0}/{item.totalPorts}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View className="items-end">
                        <View
                          className={`px-2 py-0.5 rounded-lg flex-row items-center border ${statusPill.bg} ${statusPill.border} mb-1`}
                        >
                          <View className={`w-1.5 h-1.5 rounded-full mr-1 ${statusPill.dot}`} />
                          <Text className={`text-[10px] font-poppins-bold ${statusPill.text}`}>
                            {statusPill.label}
                          </Text>
                        </View>
                        <Text className="text-[10px] font-poppins-bold text-[#4d6029]">
                          Simulate Scan →
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
