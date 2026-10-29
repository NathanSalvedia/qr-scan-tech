import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import { boxService, DistributionBox } from '@/services/boxes';
import { logsService } from '@/services/logs';
import { settingsService } from '@/services/settings';
import { playScanConfirmationBeep } from '@/services/sound';
import {
  calculateDistanceInMeters,
  evaluateProximity,
  getCurrentLocationAsync,
} from '@/utils/geo';

const FOCUS_REQUIRED_MS = 850;
const FOCUS_LOST_TIMEOUT_MS = 950;
const MIN_ALIGNED_FRAMES = 2;
const RETICLE_SIZE = 270; // 270x270dp calibrated viewfinder frame

interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function UserScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  // Scanning & processing state
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Focus & Alignment state before opening box-details
  const [focusState, setFocusState] = useState<'idle' | 'off_center' | 'focusing' | 'locked'>('idle');
  const [focusProgress, setFocusProgress] = useState(0);

  // Layout refs for accurate reticle frame alignment check
  const cameraContainerRef = useRef<View>(null);
  const reticleViewRef = useRef<View>(null);
  const containerWindowRef = useRef<RectBounds>({ x: 0, y: 0, width: 0, height: 0 });
  const reticleBoundsRef = useRef<RectBounds>({ x: 0, y: 0, width: RETICLE_SIZE, height: RETICLE_SIZE });

  // Focus tracking refs
  const focusStartTimeRef = useRef<number | null>(null);
  const lastAlignedTimeRef = useRef<number>(0);
  const alignedFrameCountRef = useRef<number>(0);
  const focusedDataRef = useRef<string | null>(null);
  const focusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLockingRef = useRef<boolean>(false);
  const [reticleScaleAnim] = useState(() => new Animated.Value(1));
  const [scanAnim] = useState(() => new Animated.Value(0));

  // Animated laser sweep line (oscillates smoothly up and down)
  useEffect(() => {
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    sweep.start();
    return () => sweep.stop();
  }, [scanAnim]);

  // Dynamic boxes cache from database
  const [boxes, setBoxes] = useState<DistributionBox[]>([]);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Tag affixing confirmation modal (for boxes with NEEDS_TAG status)
  const [tagModalBox, setTagModalBox] = useState<DistributionBox | null>(null);
  const [isUpdatingTag, setIsUpdatingTag] = useState(false);

  const resetScannerFocus = useCallback(() => {
    if (focusResetTimerRef.current) {
      clearTimeout(focusResetTimerRef.current);
      focusResetTimerRef.current = null;
    }
    if (focusLockTimerRef.current) {
      clearTimeout(focusLockTimerRef.current);
      focusLockTimerRef.current = null;
    }
    focusStartTimeRef.current = null;
    lastAlignedTimeRef.current = 0;
    alignedFrameCountRef.current = 0;
    focusedDataRef.current = null;
    isLockingRef.current = false;
    setFocusState('idle');
    setFocusProgress(0);
    Animated.spring(reticleScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  }, [reticleScaleAnim]);

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

  // Sync autoFlashlight preference, refresh box statuses, & reset focus on screen focus
  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      setScanned(false);
      setIsProcessing(false);
      resetScannerFocus();

      boxService
        .getAll()
        .then((res) => {
          if (isCurrent && res.success && Array.isArray(res.boxes)) {
            setBoxes(res.boxes);
            settingsService.saveOfflineBoxes(res.boxes);
          }
        })
        .catch(() => {
          // Keep existing boxes on error
        });

      settingsService.getScannerPreferences().then((prefs) => {
        if (isCurrent && prefs.autoFlashlight) {
          setTorchEnabled(true);
        }
      });
      return () => {
        isCurrent = false;
        resetScannerFocus();
      };
    }, [resetScannerFocus])
  );

  // Smooth progress ticker while actively focusing on a QR code inside the reticle
  useEffect(() => {
    if (focusState !== 'focusing') return;

    const interval = setInterval(() => {
      if (!focusStartTimeRef.current || isLockingRef.current) return;
      const elapsed = Date.now() - focusStartTimeRef.current;
      const rawProgress = Math.min(95, Math.round((elapsed / FOCUS_REQUIRED_MS) * 100));
      setFocusProgress(rawProgress);
    }, 60);

    return () => clearInterval(interval);
  }, [focusState]);

  const updateMeasuredBounds = useCallback(() => {
    if (cameraContainerRef.current && reticleViewRef.current) {
      cameraContainerRef.current.measureInWindow((cx, cy, cWidth, cHeight) => {
        if (cWidth > 0 && cHeight > 0) {
          containerWindowRef.current = { x: cx, y: cy, width: cWidth, height: cHeight };
        }
        reticleViewRef.current?.measureInWindow((rx, ry, rWidth, rHeight) => {
          if (rWidth > 0 && rHeight > 0) {
            reticleBoundsRef.current = {
              x: rx - (cx || 0),
              y: ry - (cy || 0),
              width: rWidth,
              height: rHeight,
            };
          }
        });
      });
    }
  }, []);

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

    // 2. Cryptographic token format: ScanOps-Box-DB-MN-01-xxxx or legacy QRTECH-BOX-DB-MN-01-xxxx
    const tokenMatch = trimmed.match(/(?:ScanOps-Box|QRTECH-BOX)-([A-Z0-9-]+)/i);
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
        resetScannerFocus();
        setScanned(false);
      }, 2500);
      return;
    }

    // 4. Box found & verified!
    setToastMessage(null);

    // Trigger haptic pulse and/or audio beep based on scanner preferences
    settingsService.getScannerPreferences().then((prefs) => {
      if (prefs.vibrateOnScan) {
        // 1. Hardware vibration for Android & iOS physical devices
        Vibration.vibrate(120);

        // 2. Haptic engine pulse
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // 3. Web vibration API fallback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(120);
          } catch {
            // Ignore web vibration error
          }
        }
      }
      if (prefs.beepOnScan) {
        playScanConfirmationBeep(prefs.beepSoundStyle);
      }
    });

    // If box has NEEDS_TAG status, offer physical placard confirmation
    if (matchedBox.status === 'NEEDS_TAG') {
      setIsProcessing(false);
      setTagModalBox(matchedBox);

      // Immediately record the physical tag detection audit to database activity logs (Admin watcher will notify admin)
      logsService
        .recordScan({
          boxId: matchedBox.id,
          boxCode: matchedBox.code,
          scanType: 'UNTAGGED_INSPECT',
          padlockVerified: true,
          boxStatusAtScan: 'NEEDS_TAG',
          auditNotes: `Physical QR placard detected on-site for ${matchedBox.code} (${matchedBox.siteName}). Awaiting physical tag affixing.`,
        })
        .then((res) => {
          if (!res.success) {
            console.warn('[Scanner] Failed to record placard audit:', res.message);
          } else {
            console.log('[Scanner] Placard audit recorded successfully in DB');
          }
        })
        .catch((err) => console.error('Failed to log placard audit:', err));

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
    overrideStatus?: string,
    customAuditNotes?: string
  ) => {
    let distanceMeters: number | null = null;
    let locationVerified = true;
    let proximityStatus = 'UNKNOWN';
    let scanLat: number | null = null;
    let scanLon: number | null = null;

    try {
      // 1. Live GPS Proximity Guard: Acquire device coordinates
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
            proximityStatus = evaluation.status;
          }
        }
      }

      const finalStatus = overrideStatus || box.status;
      await logsService.recordScan({
        boxId: box.id,
        boxCode: box.code,
        scanType,
        padlockVerified: true,
        boxStatusAtScan: finalStatus,
        scanLatitude: scanLat ?? undefined,
        scanLongitude: scanLon ?? undefined,
        distanceMeters,
        locationVerified,
        auditNotes:
          customAuditNotes ||
          (scanType === 'TAG_AFFIXED'
            ? `Physical QR placard affixed and ${box.code} (${box.siteName}) activated on-site.`
            : scanType === 'UNTAGGED_INSPECT'
            ? `Physical QR placard detected for ${box.code} (${box.siteName}) - inspected without tag affixing.`
            : scanType === 'CAMERA_QR'
            ? `Field audit scan of ${box.code} at ${box.siteName}`
            : `Scan test of ${box.code}`),
      });
    } catch (err) {
      console.error('Failed to submit scan audit log:', err);
    } finally {
      setIsProcessing(false);
      router.push({
        pathname: '/user/box-details',
        params: {
          code: box.code,
          id: box.id,
          distanceMeters: distanceMeters !== null ? String(distanceMeters) : undefined,
          locationVerified: String(locationVerified),
          proximityStatus,
        },
      });
      setTimeout(() => {
        resetScannerFocus();
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
      await executeScanAuditAndNavigate(
        updatedBox,
        'TAG_AFFIXED',
        'ACTIVE',
        `Physical QR placard affixed and ${updatedBox.code} (${updatedBox.siteName}) activated on-site.`
      );
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
    await executeScanAuditAndNavigate(
      currentBox,
      'UNTAGGED_INSPECT',
      'NEEDS_TAG',
      `Physical QR placard detected for ${currentBox.code} (${currentBox.siteName}) - inspected without tag affixing.`
    );
  };

  /**
   * Extract QR bounding box in CameraView logical coordinates (dp)
   */
  const extractQrBounds = (result: BarcodeScanningResult): RectBounds | null => {
    const b = result.bounds;
    if (b && b.size && b.size.width > 5 && b.size.height > 5) {
      return {
        x: b.origin.x,
        y: b.origin.y,
        width: b.size.width,
        height: b.size.height,
      };
    }

    const pts = result.cornerPoints;
    if (Array.isArray(pts) && pts.length >= 3) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of pts) {
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
      }
      if (maxX - minX > 5 && maxY - minY > 5) {
        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      }
    }

    return null;
  };

  /**
   * Check whether the detected QR code is centered/aligned inside the viewfinder reticle frame
   */
  const isQrAlignedInReticle = (qr: RectBounds): boolean => {
    const reticle = reticleBoundsRef.current;
    const container = containerWindowRef.current;
    if (reticle.width <= 0 || reticle.height <= 0) return true;

    // On some Android devices, native camera bounds are reported in sensor pixel dimensions
    // rather than view dp dimensions. If bounds exceed the view container, skip coordinate rejection.
    if (
      container.width > 0 &&
      container.height > 0 &&
      (qr.x + qr.width > container.width * 1.1 || qr.y + qr.height > container.height * 1.1)
    ) {
      return true;
    }

    const qrCenterX = qr.x + qr.width / 2;
    const qrCenterY = qr.y + qr.height / 2;

    // Center of QR must be inside the reticle frame
    return (
      qrCenterX >= reticle.x &&
      qrCenterX <= reticle.x + reticle.width &&
      qrCenterY >= reticle.y &&
      qrCenterY <= reticle.y + reticle.height
    );
  };

  /**
   * Step-by-step QR Focus & Alignment Handler:
   * 1. Requires QR code to be aligned inside the single viewfinder reticle frame
   * 2. Focuses & locks onto the QR code steadily before opening box-details
   */
  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || isProcessing || isLockingRef.current) return;

    const rawData = (result.data || '').trim();
    if (!rawData) return;

    // Schedule focus reset if QR leaves the camera view
    if (focusResetTimerRef.current) {
      clearTimeout(focusResetTimerRef.current);
    }
    focusResetTimerRef.current = setTimeout(() => {
      if (!isLockingRef.current && !scanned && !isProcessing) {
        resetScannerFocus();
      }
    }, FOCUS_LOST_TIMEOUT_MS);

    const qrBounds = extractQrBounds(result);
    if (qrBounds && !isQrAlignedInReticle(qrBounds)) {
      focusStartTimeRef.current = null;
      alignedFrameCountRef.current = 0;
      focusedDataRef.current = null;
      setFocusState('off_center');
      setFocusProgress(0);
      return;
    }

    const now = Date.now();

    // Start focusing if this is a new QR target or focus hasn't begun
    if (focusedDataRef.current !== rawData || focusStartTimeRef.current === null) {
      focusedDataRef.current = rawData;
      focusStartTimeRef.current = now;
      lastAlignedTimeRef.current = now;
      alignedFrameCountRef.current = 1;
      setFocusState('focusing');
      setFocusProgress(20);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.spring(reticleScaleAnim, {
        toValue: 0.94,
        useNativeDriver: true,
        friction: 6,
      }).start();
      return;
    }

    // Continue focusing on the aligned QR code
    lastAlignedTimeRef.current = now;
    alignedFrameCountRef.current += 1;

    const elapsed = now - focusStartTimeRef.current;
    const progress = Math.min(100, Math.round((elapsed / FOCUS_REQUIRED_MS) * 100));
    setFocusProgress(progress);

    // Require both focus time and multiple aligned frames before locking & opening box-details
    if (elapsed >= FOCUS_REQUIRED_MS && alignedFrameCountRef.current >= MIN_ALIGNED_FRAMES) {
      isLockingRef.current = true;
      if (focusResetTimerRef.current) {
        clearTimeout(focusResetTimerRef.current);
        focusResetTimerRef.current = null;
      }

      setFocusState('locked');
      setFocusProgress(100);

      Animated.spring(reticleScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }).start();

      // Brief visual lock confirmation on the focused QR code before opening box-details
      focusLockTimerRef.current = setTimeout(() => {
        processBoxScan(rawData, 'CAMERA_QR');
      }, 280);
    }
  };

  const cornerColor =
    focusState === 'off_center'
      ? '#f59e0b'
      : '#4d6029';

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Permission Loading / Denied State */}
      {!permission ? (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#6A795D" />
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
        <View
          ref={cameraContainerRef}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              reticleBoundsRef.current = {
                x: (width - RETICLE_SIZE) / 2,
                y: (height - RETICLE_SIZE) / 2 - 20,
                width: RETICLE_SIZE,
                height: RETICLE_SIZE,
              };
            }
            updateMeasuredBounds();
          }}
          style={StyleSheet.absoluteFill}
          className="w-full h-full relative"
        >
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torchEnabled}
            autofocus="on"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned || isProcessing ? undefined : handleBarcodeScanned}
          />

          {/* Transparent Overlay with Overlaid Close Button, Reticle & Controls */}
          <SafeAreaView className="flex-1 justify-between z-20">
            {/* 1. TOP OVERLAY: Floating Close Button, Title & Torch Toggle (Matches Reference Image) */}
            <View className="px-5 pt-3 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={handleGoBack}
                className="w-11 h-11 rounded-full bg-white/95 items-center justify-center shadow-lg active:bg-white"
                accessibilityLabel="Close scanner"
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>

              <Text className="text-base font-poppins-semibold text-white tracking-wide drop-shadow-md">
                Scan code
              </Text>

              <TouchableOpacity
                onPress={() => setTorchEnabled(!torchEnabled)}
                className={`w-11 h-11 rounded-full items-center justify-center shadow-lg active:opacity-90 ${
                  torchEnabled ? 'bg-white border-2 border-[#4d6029]' : 'bg-white/95'
                }`}
                accessibilityLabel="Toggle flashlight"
                activeOpacity={0.8}
              >
                <Ionicons
                  name={torchEnabled ? 'flash' : 'flash-off'}
                  size={22}
                  color={torchEnabled ? '#4d6029' : '#1e293b'}
                />
              </TouchableOpacity>
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

            {/* 2. CENTER RETICLE (Google Code Scanner style with green color palette) */}
            <View className="items-center justify-center">
              {/* Single Viewfinder Reticle Frame */}
              <Animated.View
                ref={reticleViewRef}
                onLayout={updateMeasuredBounds}
                style={{
                  width: RETICLE_SIZE,
                  height: RETICLE_SIZE,
                  transform: [{ scale: reticleScaleAnim }],
                }}
                className="relative items-center justify-center bg-transparent"
              >
                {/* SVG 4 Rounded Corner Brackets (Single Green Palette: #4d6029) */}
                <Svg
                  width={RETICLE_SIZE}
                  height={RETICLE_SIZE}
                  viewBox={`0 0 ${RETICLE_SIZE} ${RETICLE_SIZE}`}
                  style={StyleSheet.absoluteFill}
                >
                  {/* Top-Left Corner Bracket */}
                  <Path
                    d="M 8 56 L 8 32 A 24 24 0 0 1 32 8 L 56 8"
                    stroke={cornerColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Top-Right Corner Bracket */}
                  <Path
                    d="M 214 8 L 238 8 A 24 24 0 0 1 262 32 L 262 56"
                    stroke={cornerColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Bottom-Right Corner Bracket */}
                  <Path
                    d="M 262 214 L 262 238 A 24 24 0 0 1 238 262 L 214 262"
                    stroke={cornerColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Bottom-Left Corner Bracket */}
                  <Path
                    d="M 56 262 L 32 262 A 24 24 0 0 1 8 238 L 8 214"
                    stroke={cornerColor}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>

                {/* Animated Laser Sweep Line (idle/scanning) */}
                {focusState !== 'locked' && (
                  <Animated.View
                    style={{
                      transform: [
                        {
                          translateY: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [16, RETICLE_SIZE - 20],
                          }),
                        },
                      ],
                    }}
                    className="w-56 h-0.5 self-center absolute rounded-full bg-[#4d6029]/80 shadow-md shadow-[#4d6029]"
                  />
                )}

                {/* Focus Progress Bar inside frame */}
                {(focusState === 'focusing' || focusState === 'locked') && (
                  <View className="w-44 h-1.5 bg-black/50 rounded-full overflow-hidden absolute bottom-12 border border-white/20">
                    <View
                      style={{ width: `${focusProgress}%` }}
                      className="h-full rounded-full bg-[#4d6029]"
                    />
                  </View>
                )}
              </Animated.View>

              {/* Status Badge below Reticle */}
              <View className="mt-5 bg-black/60 px-4 py-2 rounded-full border border-white/20 shadow-lg flex-row items-center">
                {isProcessing ? (
                  <>
                    <ActivityIndicator size="small" color="#4d6029" style={{ marginRight: 8 }} />
                    <Text className="text-xs font-poppins-medium text-white">
                      Verifying Network Database...
                    </Text>
                  </>
                ) : focusState === 'locked' || scanned ? (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4d6029"
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-xs font-poppins-semibold text-white">
                      QR Focused! Opening Details...
                    </Text>
                  </>
                ) : focusState === 'focusing' ? (
                  <>
                    <View className="w-2.5 h-2.5 rounded-full bg-[#4d6029] mr-2" />
                    <Text className="text-xs font-poppins-medium text-white">
                      Focusing QR Code... Hold Steady
                    </Text>
                  </>
                ) : focusState === 'off_center' ? (
                  <>
                    <View className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-2" />
                    <Text className="text-xs font-poppins-medium text-amber-300">
                      Center QR inside frame to focus
                    </Text>
                  </>
                ) : (
                  <>
                    <View className="w-2.5 h-2.5 rounded-full bg-[#4d6029] mr-2" />
                    <Text className="text-xs font-poppins-medium text-white/90">
                      Align QR inside frame
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* 3. BOTTOM HELPER & CAMERA FLIP */}
            <View className="pb-8 items-center px-6 w-full max-w-sm self-center">
              <TouchableOpacity
                onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                className="bg-black/40 border border-white/20 px-4 py-2 rounded-full flex-row items-center active:bg-black/60 mb-3 shadow-md"
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse-outline" size={16} color="#ffffff" />
                <Text className="text-xs font-poppins-medium text-white/90 ml-2">
                  Flip Camera
                </Text>
              </TouchableOpacity>

              <Text className="text-xs font-poppins-medium text-white/70 text-center tracking-wide">
                Point camera at physical distribution box QR placard
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* 4. MODAL: PHYSICAL TAG AFFIXING VERIFICATION (For NEEDS_TAG boxes) */}
      <Modal
        visible={Boolean(tagModalBox)}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => {
          setTagModalBox(null);
          resetScannerFocus();
          setScanned(false);
        }}
      >
        <View className="flex-1 bg-black/75 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <View className="w-12 h-12 rounded-2xl bg-amber-100 items-center justify-center self-center mb-3">
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
                    Tag & Activate Box
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
                resetScannerFocus();
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
    </View>
  );
}
