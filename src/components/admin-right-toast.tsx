import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAdminToast } from '@/context/admin-toast-context';

export function AdminRightToast() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { activeToast, hideToast } = useAdminToast();

  const [translateX] = useState(() => new Animated.Value(380));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (activeToast) {
      translateX.setValue(380);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          friction: 7,
          tension: 45,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      const duration = activeToast.duration ?? 4500;
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 380,
            duration: 220,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start(() => {
          hideToast();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [activeToast, translateX, opacity, hideToast]);

  if (!activeToast) {
    return null;
  }

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 380,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      hideToast();
    });
  };

  const handleCardPress = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 380,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      hideToast();
      if (activeToast.onPress) {
        activeToast.onPress();
      } else {
        router.push('/admin/activity-logs');
      }
    });
  };

  // Determine styles and labels based on category
  let badgeBg = 'bg-[#4d6029]/10 border-[#4d6029]/20';
  let badgeColor = '#4d6029';
  let badgeLabel = 'NEW USER';

  if (activeToast.category === 'TAG_AFFIXED') {
    badgeBg = 'bg-[#4d6029]/15 border-[#4d6029]/30';
    badgeColor = '#4d6029';
    badgeLabel = 'TAG ACTIVATED';
  } else if (activeToast.category === 'SCAN') {
    badgeBg = 'bg-blue-500/10 border-blue-500/20';
    badgeColor = '#2563eb';
    badgeLabel = 'BOX SCAN';
  } else if (activeToast.category === 'ALARM') {
    badgeBg = 'bg-red-500/10 border-red-500/20';
    badgeColor = '#dc2626';
    badgeLabel = 'BOX ALARM';
  } else if (activeToast.category === 'BOX_UPDATE') {
    badgeBg = 'bg-sky-500/10 border-sky-500/20';
    badgeColor = '#0284c7';
    badgeLabel = 'BOX UPDATE';
  }

  const cardWidth = Math.min(380, width - 32);

  return (
    <Animated.View
      pointerEvents={activeToast ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        top: Math.max(insets.top, 12) + 8,
        right: 16,
        width: cardWidth,
        transform: [{ translateX }],
        opacity,
        zIndex: 99999,
        elevation: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      }}
    >
      <View className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Top bar with category badge, timestamp, and close button */}
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center space-x-2">
            <View
              className={`w-7 h-7 rounded-full items-center justify-center border ${badgeBg}`}
            >
              {activeToast.category === 'TAG_AFFIXED' ? (
                <Ionicons name="shield-checkmark" size={16} color={badgeColor} />
              ) : activeToast.category === 'SCAN' ? (
                <MaterialCommunityIcons name="qrcode-scan" size={16} color={badgeColor} />
              ) : activeToast.category === 'ALARM' ? (
                <Ionicons name="warning" size={16} color={badgeColor} />
              ) : activeToast.category === 'BOX_UPDATE' ? (
                <MaterialCommunityIcons name="cube-outline" size={16} color={badgeColor} />
              ) : (
                <Ionicons name="person-add" size={16} color={badgeColor} />
              )}
            </View>
            <View
              className={`px-2 py-0.5 rounded-full border ${badgeBg}`}
            >
              <Text
                className="text-[10px] font-poppins-bold tracking-wider"
                style={{ color: badgeColor }}
              >
                {badgeLabel}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            <Text className="text-[11px] font-poppins text-slate-400">
              {activeToast.timestamp || 'Just now'}
            </Text>
            <TouchableOpacity
              onPress={handleDismiss}
              className="w-6 h-6 rounded-full bg-slate-100 items-center justify-center active:opacity-70 ml-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Clickable body content */}
        <TouchableOpacity
          onPress={handleCardPress}
          activeOpacity={0.85}
          className="w-full"
        >
          <Text
            className="text-sm font-poppins-bold text-[#0f172a] mb-1"
            numberOfLines={1}
          >
            {activeToast.title}
          </Text>
          <Text
            className="text-xs font-poppins text-slate-600 leading-relaxed mb-2.5"
            numberOfLines={2}
          >
            {activeToast.description}
          </Text>

          {/* Action indicator button */}
          <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
            <Text
              className="text-xs font-poppins-bold"
              style={{ color: badgeColor }}
            >
              View in Activity Logs
            </Text>
            <Ionicons name="arrow-forward" size={14} color={badgeColor} />
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
