import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { settingsService, BeepSoundStyle } from '@/services/settings';
import {
  BEEP_SOUND_OPTIONS,
  playScanConfirmationBeep,
} from '@/services/sound';

export default function ScanSoundScreen() {
  const router = useRouter();
  const [beepOnScan, setBeepOnScan] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<BeepSoundStyle>('tech-chirp');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const prefs = await settingsService.getScannerPreferences();
        if (!isMounted) return;
        setBeepOnScan(prefs.beepOnScan);
        if (prefs.beepSoundStyle) {
          setSelectedStyle(prefs.beepSoundStyle);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleBeep = async (val: boolean) => {
    setBeepOnScan(val);
    await settingsService.setScannerPreferences({ beepOnScan: val });
  };

  const handleSelectSound = async (style: BeepSoundStyle) => {
    setSelectedStyle(style);
    await settingsService.setScannerPreferences({ beepSoundStyle: style });
    handleAudition(style);
  };

  const handleAudition = (style: BeepSoundStyle) => {
    setPlayingId(style);
    playScanConfirmationBeep(style);
    setTimeout(() => {
      setPlayingId(null);
    }, 450);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      {/* Screen Container */}
      <View className="flex-1 px-4 pt-3 max-w-[600px] w-full self-center">
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 items-center justify-center mr-3 shadow-sm active:bg-slate-100"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#0f172a" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-[11px] font-poppins-semibold tracking-wider text-[#64748b] uppercase">
                Scanner Audio
              </Text>
              <Text className="text-xl font-poppins-bold text-[#0f172a] mt-0.5">
                Scan Beep Sound
              </Text>
            </View>
          </View>
          <View className="w-10 h-10 rounded-2xl bg-[#4d6029]/10 items-center justify-center border border-[#4d6029]/20">
            <Ionicons name="volume-high-outline" size={20} color="#4d6029" />
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" color="#4d6029" />
            <Text className="text-xs font-poppins-medium text-[#64748b] mt-2">
              Loading preferences...
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Master Beep Toggle Card */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-200/80 shadow-sm shadow-slate-200/40 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-3">
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-3 border ${
                    beepOnScan
                      ? 'bg-[#4d6029]/10 border-[#4d6029]/20'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <Ionicons
                    name={beepOnScan ? 'volume-high' : 'volume-mute'}
                    size={20}
                    color={beepOnScan ? '#4d6029' : '#64748b'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-poppins-bold text-[#0f172a]">
                    Enable Beep on Scan
                  </Text>
                  <Text className="text-[11px] font-poppins-medium text-[#64748b] mt-0.5">
                    {beepOnScan
                      ? 'Audio tone will play upon successful QR scan'
                      : 'Scanner is muted (vibration only)'}
                  </Text>
                </View>
              </View>
              <Switch
                value={beepOnScan}
                onValueChange={handleToggleBeep}
                trackColor={{ false: '#cbd5e1', true: '#4d6029' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Sound Style Selection Section */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2.5 ml-1">
                <Text className="text-[11px] font-poppins-bold text-[#64748b] tracking-wider uppercase">
                  Available Beep Tones
                </Text>
                <Text className="text-[10px] font-poppins-medium text-[#64748b]">
                  Tap to preview & select
                </Text>
              </View>

              <View className="space-y-3">
                {BEEP_SOUND_OPTIONS.map((opt) => {
                  const isSelected = selectedStyle === opt.id;
                  const isPlaying = playingId === opt.id;

                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => handleSelectSound(opt.id)}
                      activeOpacity={0.8}
                      className={`bg-white rounded-2xl p-4 border transition-all mb-3 ${
                        isSelected
                          ? 'border-[#4d6029] bg-[#4d6029]/[0.02] shadow-sm'
                          : 'border-slate-200/80 shadow-sm shadow-slate-200/40 active:bg-slate-50'
                      }`}
                    >
                      <View className="flex-row items-start justify-between">
                        {/* Left Side: Icon & Details */}
                        <View className="flex-row items-start flex-1 mr-3">
                          <View
                            className={`w-10 h-10 rounded-xl items-center justify-center mr-3 border ${
                              isSelected
                                ? 'bg-[#4d6029]/15 border-[#4d6029]/30'
                                : 'bg-slate-100 border-slate-200'
                            }`}
                          >
                            <Ionicons
                              name={opt.icon as any}
                              size={20}
                              color={isSelected ? '#4d6029' : '#475569'}
                            />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
                              <Text className="text-sm font-poppins-bold text-[#0f172a]">
                                {opt.name}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: `${opt.badgeColor}15`,
                                  borderColor: `${opt.badgeColor}30`,
                                }}
                                className="px-2 py-0.5 rounded-full border"
                              >
                                <Text
                                  style={{ color: opt.badgeColor }}
                                  className="text-[9px] font-poppins-semibold"
                                >
                                  {opt.badge}
                                </Text>
                              </View>
                            </View>

                            <Text className="text-[11px] font-poppins-medium text-[#64748b] leading-relaxed">
                              {opt.description}
                            </Text>
                          </View>
                        </View>

                        {/* Right Side: Selection Radio Checkmark */}
                        <View
                          className={`w-6 h-6 rounded-full items-center justify-center border mt-0.5 ${
                            isSelected
                              ? 'bg-[#4d6029] border-[#4d6029]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="#ffffff" />
                          )}
                        </View>
                      </View>

                      {/* Bottom Action Bar: Audition / Test Button */}
                      <View className="mt-3 pt-3 border-t border-slate-100 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons
                            name="waveform"
                            size={14}
                            color={isSelected ? '#4d6029' : '#94a3b8'}
                          />
                          <Text className="text-[10px] font-poppins-medium text-[#64748b] ml-1">
                            {opt.subtitle}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleAudition(opt.id)}
                          activeOpacity={0.7}
                          className={`px-3 py-1.5 rounded-xl flex-row items-center border ${
                            isPlaying
                              ? 'bg-[#4d6029] border-[#4d6029]'
                              : isSelected
                              ? 'bg-[#4d6029]/10 border-[#4d6029]/20'
                              : 'bg-slate-100 border-slate-200'
                          }`}
                        >
                          <Ionicons
                            name={isPlaying ? 'volume-high' : 'play'}
                            size={12}
                            color={
                              isPlaying
                                ? '#ffffff'
                                : isSelected
                                ? '#4d6029'
                                : '#475569'
                            }
                          />
                          <Text
                            className={`text-[10px] font-poppins-bold ml-1 ${
                              isPlaying
                                ? 'text-white'
                                : isSelected
                                ? 'text-[#4d6029]'
                                : 'text-[#475569]'
                            }`}
                          >
                            {isPlaying ? 'Playing...' : 'Test Sound'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Information Banner */}
            <View className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200 flex-row items-start">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#64748b"
                style={{ marginRight: 8, marginTop: 1 }}
              />
              <View className="flex-1">
                <Text className="text-[11px] font-poppins-semibold text-[#334155]">
                  Field Audio Feedback
                </Text>
                <Text className="text-[10px] font-poppins-medium text-[#64748b] mt-0.5 leading-relaxed">
                  Your chosen scan tone works in combination with device haptics so you can verify physical QR placard detections immediately in noisy environments.
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
