import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SidebarNavigation, useSidebarCollapse } from '@/components/sidebar-navigation';
import { WebView } from 'react-native-webview';

import { useDashboardData } from '@/hooks/useDashboardData';
import type { BoxData } from '@/services/dashboard';

type FilterType = 'ALL' | 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE';

export default function AdminDashboardScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [selectedPin, setSelectedPin] = useState<BoxData | null>(null);
  const [selectedBoxForQR, setSelectedBoxForQR] = useState<BoxData | null>(null);
  const [mapMode, setMapMode] = useState<'STREET_PINS' | 'SATELLITE'>('STREET_PINS');
  const { isCollapsed: isSidebarCollapsed, toggleSidebar: toggleSidebarCollapse } = useSidebarCollapse();
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);

  const isWeb = Platform.OS === 'web';

  const { stats, boxes, loading, refresh } = useDashboardData();

  const filteredPins = boxes.filter((pin) => {
    if (activeFilter === 'ACTIVE') return pin.status === 'ACTIVE';
    if (activeFilter === 'NEEDS_TAG') return pin.status === 'NEEDS_TAG';
    if (activeFilter === 'ISSUE') return pin.status === 'ISSUE';
    return true;
  });

  // Listen for Escape key on web to exit fullscreen
  useEffect(() => {
    if (isWeb && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isMapFullScreen) {
          setIsMapFullScreen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isWeb, isMapFullScreen]);

  // Listen for pin clicks from the embedded map iframe
  useEffect(() => {
    if (isWeb && typeof window !== 'undefined') {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SELECT_PIN') {
          const found = boxes.find((p) => p.id === event.data.pinId);
          if (found) {
            setSelectedPin(found);
          }
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isWeb, boxes]);

  const getStatusColor = (status: BoxData['status']) => {
    switch (status) {
      case 'ACTIVE':
        return {
          bg: '#4d6029',
          border: 'border-emerald-600',
          text: 'text-white',
          label: 'Tagged & Active',
          badgeClass: 'bg-[#4d6029]',
        };
      case 'NEEDS_TAG':
        return {
          bg: '#d97706',
          border: 'border-amber-600',
          text: 'text-white',
          label: 'Needs QR Tag',
          badgeClass: 'bg-[#d97706]',
        };
      case 'ISSUE':
        return {
          bg: '#dc2626',
          border: 'border-rose-600',
          text: 'text-white',
          label: 'Alarm / Issue',
          badgeClass: 'bg-[#dc2626]',
        };
    }
  };

  // Generate real interactive Google Maps tiles with Leaflet
  const generateMapHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="referrer" content="no-referrer" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body, html, #map { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; }
          
          .custom-pin-container {
            background: transparent !important;
            border: none !important;
          }
          
          /* Field-ready calibrated pin badge: anchored at exact bottom tip (60px, 56px) */
          .custom-pin-badge {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            width: 120px;
            height: 56px;
            cursor: pointer;
            transform-origin: 50% 100%;
            transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.18s ease;
            filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
          }
          .custom-pin-badge:hover, .custom-pin-badge.selected {
            transform: scale(1.12);
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5));
            z-index: 1000 !important;
          }
          
          .pin-pill {
            padding: 3px 9px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 11px;
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
          }
          .pin-pill.active { background-color: #4d6029; }
          .pin-pill.needs-tag { background-color: #d97706; }
          .pin-pill.issue { background-color: #dc2626; }
          
          .pin-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
            box-shadow: 0 0 4px rgba(255,255,255,0.8);
          }
          
          .pin-sublabel {
            background: rgba(255, 255, 255, 0.96);
            color: #0f172a;
            font-size: 9.5px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 5px;
            margin-top: 2px;
            border: 1px solid rgba(0,0,0,0.15);
            box-shadow: 0 2px 6px rgba(0,0,0,0.18);
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          /* Downward pointer needle pointing directly at GPS coordinate */
          .pin-needle {
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid #4d6029;
            margin-top: -1px;
            z-index: 2;
          }
          .pin-needle.active { border-top-color: #4d6029; }
          .pin-needle.needs-tag { border-top-color: #d97706; }
          .pin-needle.issue { border-top-color: #dc2626; }
          
          /* Ground contact target dot placed at exact coordinate */
          .pin-ground-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #0f172a;
            border: 1.5px solid #ffffff;
            box-shadow: 0 0 0 2px rgba(77, 96, 41, 0.6);
            margin-top: -1px;
            z-index: 3;
          }
          .pin-ground-dot.needs-tag { box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.6); }
          .pin-ground-dot.issue { box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.6); }
          
          /* Custom Google Style Zoom & Layer Controls */
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18) !important;
            border-radius: 10px !important;
            overflow: hidden;
          }
          .leaflet-control-zoom a {
            background: #ffffff !important;
            color: #334155 !important;
            font-weight: bold !important;
          }
          .leaflet-control-zoom a:hover {
            background: #f8fafc !important;
          }
          .leaflet-control-layers {
            border-radius: 10px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18) !important;
            border: none !important;
            font-weight: 600 !important;
            font-size: 11px !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var pins = ${JSON.stringify(filteredPins)};

          // Compute dynamic centroid center
          var defaultCenter = pins.length > 0
            ? [
                pins.reduce(function(acc, p) { return acc + Number(p.latitude); }, 0) / pins.length,
                pins.reduce(function(acc, p) { return acc + Number(p.longitude); }, 0) / pins.length
              ]
            : [8.2276, 124.2385];

          var map = L.map('map', {
            center: defaultCenter,
            zoom: 15,
            zoomControl: true
          });

          // Primary Google Maps Street Layer
          var googleStreet = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 21,
            attribution: 'Map data &copy; Google'
          });

          // Google Maps Satellite + Streets Hybrid Layer
          var googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 21,
            attribution: 'Imagery &copy; Google'
          });

          var activeMode = '${mapMode}';
          if (activeMode === 'SATELLITE') {
            googleHybrid.addTo(map);
          } else {
            googleStreet.addTo(map);
          }

          var baseLayers = {
            "Google Streets": googleStreet,
            "Google Satellite": googleHybrid
          };
          L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

          var markerGroup = L.featureGroup();

          function notifySelection(pinId) {
            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage({ type: 'SELECT_PIN', pinId: pinId }, '*');
            }
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_PIN', pinId: pinId }));
            }
          }

          pins.forEach(function(pin) {
            var statusClass = pin.status === 'ACTIVE' ? 'active' : (pin.status === 'NEEDS_TAG' ? 'needs-tag' : 'issue');
            var displayName = pin.siteName ? pin.siteName.split('-')[0].split('/')[0].trim() : pin.code;

            var icon = L.divIcon({
              className: 'custom-pin-container',
              html: '<div class="custom-pin-badge" id="badge-' + pin.id + '">' +
                      '<div class="pin-pill ' + statusClass + '">' +
                        '<span class="pin-dot"></span>' +
                        '<span>' + pin.code + '</span>' +
                      '</div>' +
                      '<div class="pin-sublabel">' + displayName + '</div>' +
                      '<div class="pin-needle ' + statusClass + '"></div>' +
                      '<div class="pin-ground-dot ' + statusClass + '"></div>' +
                    '</div>',
              iconSize: [120, 56],
              iconAnchor: [60, 56]
            });

            var marker = L.marker([Number(pin.latitude), Number(pin.longitude)], { icon: icon });
            marker.on('click', function() {
              map.flyTo([Number(pin.latitude), Number(pin.longitude)], Math.max(map.getZoom(), 17), { duration: 0.6 });
              notifySelection(pin.id);
            });
            markerGroup.addLayer(marker);
          });

          markerGroup.addTo(map);

          // Auto-fit to markers with padding
          function fitMarkers() {
            if (pins.length > 0) {
              map.fitBounds(markerGroup.getBounds().pad(0.18), { maxZoom: 17 });
            }
          }

          fitMarkers();

          // Ensure map canvas properly sizes inside iframe
          setTimeout(function() {
            map.invalidateSize();
            fitMarkers();
          }, 200);

          window.addEventListener('resize', function() {
            map.invalidateSize();
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />
      <View className="flex-1 flex-row h-full">
        {/* Responsive Collapsible Sidebar */}
        {isWeb && (
          <SidebarNavigation
            activeRoute="/admin/dashboard"
            collapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            className="hidden md:flex"
            badgeCounts={{
              boxes: stats.totalBoxes > 0 ? stats.totalBoxes : boxes.length > 0 ? boxes.length : undefined,
              newQr: stats.needsTagCount > 0 ? `${stats.needsTagCount} New` : undefined,
              logs: stats.issuesCount > 0 ? String(stats.issuesCount) : undefined,
            }}
          />
        )}

        {/* Main Dashboard Canvas */}
        <View className="flex-1 flex-col h-full overflow-hidden">
          <ScrollView
            showsVerticalScrollIndicator={true}
            className="flex-1 p-4 md:p-6"
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* 1. TOP ROW OF 4 KPI METRIC CARDS */}
            <View className="flex-row flex-wrap -mx-2 mb-4">
              {/* Card 1: Distribution Boxes */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm relative justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Distribution Boxes
                    </Text>
                    <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center border border-slate-200/60">
                      <MaterialCommunityIcons name="server" size={16} color="#475569" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {stats?.totalBoxes ?? boxes.length}
                    </Text>
                    <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-poppins-bold text-[#475569]">
                        {stats?.mainBoxes ?? 0} Main · {stats?.subBoxes ?? 0} Sub
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]" numberOfLines={1}>
                    Wall & Pole Enclosures across Iligan City
                  </Text>
                </View>
              </View>

              {/* Card 2: Tagged & Active (Green border highlight) */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/40 shadow-sm relative justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Tagged & Active
                    </Text>
                    <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {stats?.activeCount ?? 0}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Text className="text-[10px] font-poppins-bold text-emerald-700">
                        {stats?.verifiedPercentage ?? '0'}% Verified
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]" numberOfLines={1}>
                    Door QR codes mapped & active
                  </Text>
                </View>
              </View>

              {/* Card 3: Pending QR Tag (Amber border highlight) */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-amber-500/40 shadow-sm relative justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Pending QR Tag
                    </Text>
                    <View className="w-6 h-6 rounded-full bg-amber-500 items-center justify-center">
                      <Ionicons name="time-outline" size={14} color="#ffffff" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {stats?.needsTagCount ?? 0}
                    </Text>
                    <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Text className="text-[10px] font-poppins-bold text-amber-700">
                        Needs Dispatch
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]" numberOfLines={1}>
                    Awaiting physical QR label sticker
                  </Text>
                </View>
              </View>

              {/* Card 4: Rack Alarms (Red border highlight) */}
              <View className="w-full sm:w-1/2 lg:w-1/4 px-2 mb-3">
                <View className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-rose-500/40 shadow-sm relative justify-between h-32">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-medium text-[#64748b]">
                      Rack Alarms & Issues
                    </Text>
                    <View className="w-6 h-6 rounded-full bg-rose-500 items-center justify-center">
                      <Ionicons name="alert" size={13} color="#ffffff" />
                    </View>
                  </View>
                  <View className="flex-row items-baseline space-x-2">
                    <Text className="text-3xl font-poppins-bold text-[#0f172a] mr-2">
                      {stats?.issuesCount ?? 0}
                    </Text>
                    <View className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      <Text className="text-[10px] font-poppins-bold text-rose-700">
                        {(stats?.issuesCount ?? 0) > 0 ? "Requires Attention" : "All Nominal"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]" numberOfLines={1}>
                    Active Maintenance Reports
                  </Text>
                </View>
              </View>
            </View>

            {/* 2. MAIN INFRASTRUCTURE REAL GOOGLE MAPS CANVAS */}
            <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Map Section Header */}
              <View className="px-5 py-4 border-b border-slate-100 flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
                <View className="flex-row items-center">
                  <View className="w-7 h-7 rounded-lg bg-[#4d6029]/10 items-center justify-center mr-2.5">
                    <Ionicons name="map-outline" size={16} color="#4d6029" />
                  </View>
                  <Text className="text-base font-poppins-bold text-[#0f172a] mr-3">
                    Distribution Box Network Locations
                  </Text>
                  <View className="hidden sm:flex bg-slate-100 px-2.5 py-1 rounded-full">
                    <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                      🟢 Main Boxes & Sub-Boxes
                    </Text>
                  </View>
                </View>

                {/* Filter Pills & Map Mode Switcher */}
                <View className="flex-row items-center flex-wrap gap-1.5">
                  <TouchableOpacity
                    onPress={() => setActiveFilter('ALL')}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-full ${
                      activeFilter === 'ALL'
                        ? 'bg-[#4d6029]'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-poppins-bold ${
                        activeFilter === 'ALL' ? 'text-white' : 'text-[#475569]'
                      }`}
                    >
                      All Boxes ({boxes.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveFilter('ACTIVE')}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-full ${
                      activeFilter === 'ACTIVE'
                        ? 'bg-[#4d6029]'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-poppins-bold ${
                        activeFilter === 'ACTIVE' ? 'text-white' : 'text-[#475569]'
                      }`}
                    >
                      Active ({boxes.filter(b => b.status === 'ACTIVE').length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveFilter('NEEDS_TAG')}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-full ${
                      activeFilter === 'NEEDS_TAG'
                        ? 'bg-[#d97706]'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-poppins-bold ${
                        activeFilter === 'NEEDS_TAG' ? 'text-white' : 'text-[#475569]'
                      }`}
                    >
                      Needs Tag ({boxes.filter(b => b.status === 'NEEDS_TAG').length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveFilter('ISSUE')}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-full ${
                      activeFilter === 'ISSUE'
                        ? 'bg-[#dc2626]'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-poppins-bold ${
                        activeFilter === 'ISSUE' ? 'text-white' : 'text-[#475569]'
                      }`}
                    >
                      Issues ({boxes.filter(b => b.status === 'ISSUE').length})
                    </Text>
                  </TouchableOpacity>

                  {/* Satellite / Street Map Toggle */}
                  <TouchableOpacity
                    onPress={() =>
                      setMapMode(mapMode === 'STREET_PINS' ? 'SATELLITE' : 'STREET_PINS')
                    }
                    className={`ml-2 px-3 py-1.5 rounded-full border flex-row items-center ${
                      mapMode === 'SATELLITE'
                        ? 'bg-sky-600 border-sky-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={mapMode === 'SATELLITE' ? 'map' : 'earth'}
                      size={13}
                      color={mapMode === 'SATELLITE' ? '#ffffff' : '#0284c7'}
                    />
                    <Text
                      className={`text-xs font-poppins-bold ml-1 ${
                        mapMode === 'SATELLITE' ? 'text-white' : 'text-[#0284c7]'
                      }`}
                    >
                      {mapMode === 'SATELLITE' ? 'Street Pins' : 'Google Satellite'}
                    </Text>
                  </TouchableOpacity>

                  {/* Refresh Button */}
                  <TouchableOpacity
                    onPress={refresh}
                    disabled={loading}
                    className="ml-1 px-2.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex-row items-center"
                    activeOpacity={0.8}
                    accessibilityLabel="Refresh Data"
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={13}
                      color={loading ? "#94a3b8" : "#475569"}
                    />
                  </TouchableOpacity>

                  {/* Fullscreen Map Button */}
                  <TouchableOpacity
                    onPress={() => setIsMapFullScreen(true)}
                    className="ml-1 px-2.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex-row items-center shadow-xs"
                    activeOpacity={0.8}
                    accessibilityLabel="Fullscreen Map"
                  >
                    <Ionicons
                      name="expand-outline"
                      size={13}
                      color="#475569"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Real Map Viewport Container - Expanded Height */}
              <View
                className="w-full relative bg-[#e5e3df] overflow-hidden"
                style={{ height: isWeb ? 740 : 540 }}
              >
                {isWeb ? (
                  /* Real Street / Satellite Map with Official Google Tiles & Interactive DB-MN / DB-SB Markers */
                  <iframe
                    key={`map-${activeFilter}-${mapMode}`}
                    title="Iligan Distribution Box Network Map"
                    srcDoc={generateMapHtml()}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 0,
                    }}
                  />
                ) : (
                  <WebView
                    key={`admin-map-webview-${activeFilter}-${mapMode}`}
                    originWhitelist={['*']}
                    source={{ html: generateMapHtml() }}
                    style={{ flex: 1 }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    onMessage={(event) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'SELECT_PIN') {
                          const found = boxes.find((p) => p.id === data.pinId);
                          if (found) setSelectedPin(found);
                        }
                      } catch {
                        // Fallback
                      }
                    }}
                  />
                )}

                {/* Floating Fullscreen Action Button on Map */}
                <TouchableOpacity
                  onPress={() => setIsMapFullScreen(true)}
                  className="absolute bottom-5 right-5 z-20 bg-white/95 hover:bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-200/80 flex-row items-center"
                  activeOpacity={0.85}
                  accessibilityLabel="Fullscreen Map"
                >
                  <Ionicons name="expand" size={14} color="#0f172a" />
                  <Text className="text-xs font-poppins-bold text-[#0f172a] ml-1.5">
                    Fullscreen
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. SELECTED PIN INSPECTOR DRAWER */}

            {selectedPin && (
              <View className="mt-4 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <View className="flex-row items-center space-x-2">
                    <View
                      className={`px-3 py-1.5 rounded-xl ${
                        getStatusColor(selectedPin.status).badgeClass
                      }`}
                    >
                      <Text className="text-xs font-poppins-bold text-white">
                        {selectedPin.code}
                      </Text>
                    </View>
                    <Text className="text-base font-poppins-bold text-[#0f172a] ml-2">
                      {selectedPin.siteName}
                    </Text>
                    <View
                      className={`px-2.5 py-0.5 rounded-full ${
                        selectedPin.category === 'MAIN_BOX'
                          ? 'bg-[#4d6029]/15'
                          : 'bg-sky-100'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-poppins-bold ${
                          selectedPin.category === 'MAIN_BOX'
                            ? 'text-[#4d6029]'
                            : 'text-sky-700'
                        }`}
                      >
                        {selectedPin.category === 'MAIN_BOX' ? 'MAIN DISTRIBUTION BOX' : 'SUB-DISTRIBUTION BOX'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedPin(null)}
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200"
                    accessibilityLabel="Close Drawer"
                  >
                    <Ionicons name="close" size={18} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Details Grid */}
                <View className="flex-row flex-wrap justify-between items-center gap-4">
                  <View className="flex-1 min-w-[200px]">
                    <Text className="text-xs font-poppins-semibold text-[#64748b]">
                      Physical Location:
                    </Text>
                    <Text className="text-xs font-poppins-medium text-[#1e293b]">
                      {selectedPin.address}
                    </Text>
                    {selectedPin.parentCode && (
                      <Text className="text-[11px] font-poppins text-[#4d6029] mt-0.5">
                        Connected to Parent Box: {selectedPin.parentCode}
                      </Text>
                    )}
                  </View>

                  <View className="min-w-[150px]">
                    <Text className="text-xs font-poppins-semibold text-[#64748b]">
                      Internal Equipment:
                    </Text>
                    <Text className="text-xs font-poppins-medium text-[#1e293b]">
                      {selectedPin.equipmentItems.join(', ')}
                    </Text>
                  </View>

                  <View className="min-w-[100px]">
                    <Text className="text-xs font-poppins-semibold text-[#64748b]">
                      Active Clients:
                    </Text>
                    <Text className="text-sm font-poppins-bold text-[#0f172a]">
                      {selectedPin.clientsCount} Accounts
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      onPress={() => setSelectedBoxForQR(selectedPin)}
                      className="bg-[#4d6029] px-4 py-2.5 rounded-xl flex-row items-center shadow-sm mr-2"
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={16} color="#ffffff" />
                      <Text className="text-white text-xs font-poppins-bold ml-1.5">
                        Print QR Sticker
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.push('/admin/box-management' as any)}
                      className="bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl flex-row items-center"
                      activeOpacity={0.7}
                    >
                      <Text className="text-[#334155] text-xs font-poppins-bold">
                        View Box Details →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* 4. PRINTABLE THERMAL QR STICKER MODAL */}
      {selectedBoxForQR && (
        <Modal
          visible={!!selectedBoxForQR}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedBoxForQR(null)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <Text className="text-base font-poppins-bold text-[#0f172a]">
                  Thermal QR Sticker Label
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedBoxForQR(null)}
                  className="p-1.5 rounded-full bg-slate-100"
                  accessibilityLabel="Close Sticker Modal"
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Printable Sticker Preview Card */}
              <View className="bg-white p-5 rounded-2xl border-2 border-dashed border-slate-300 items-center mb-5">
                <View className="flex-row items-center mb-2">
                  <View className="w-5 h-5 rounded bg-[#4d6029] items-center justify-center mr-1.5">
                    <MaterialCommunityIcons name="qrcode-scan" size={12} color="#ffffff" />
                  </View>
                  <Text className="text-[11px] font-poppins-bold text-[#0f172a] uppercase tracking-wider">
                    MULTIFACTORS · ILIGAN
                  </Text>
                </View>

                {/* Real Scannable QR Code */}
                <View className="w-36 h-36 bg-[#f8fafc] border border-slate-200 rounded-2xl items-center justify-center p-2 mb-3 shadow-inner">
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
                        selectedBoxForQR.qrToken || selectedBoxForQR.code
                      )}`,
                    }}
                    className="w-32 h-32"
                    resizeMode="contain"
                  />
                </View>

                <Text className="text-lg font-poppins-bold text-[#0f172a]">
                  {selectedBoxForQR.code}
                </Text>
                <Text className="text-xs font-poppins-semibold text-[#4d6029]">
                  {selectedBoxForQR.category === 'MAIN_BOX' ? 'MAIN DISTRIBUTION BOX' : 'SUB-DISTRIBUTION BOX'}
                </Text>
                <Text className="text-[11px] font-poppins text-[#64748b] text-center mt-1">
                  {selectedBoxForQR.siteName}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  onPress={() => {
                    alert(`Printing 50x50mm QR label for ${selectedBoxForQR.code}`);
                    setSelectedBoxForQR(null);
                  }}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl items-center justify-center flex-row shadow-sm mr-2"
                  activeOpacity={0.85}
                >
                  <Ionicons name="print-outline" size={18} color="#ffffff" />
                  <Text className="text-white text-xs font-poppins-bold ml-1.5">
                    Print 50x50mm
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedBoxForQR(null)}
                  className="px-4 py-3 bg-slate-100 rounded-xl items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-[#475569] text-xs font-poppins-bold">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* FULLSCREEN MAP MODAL */}
      <Modal
        visible={isMapFullScreen}
        animationType="fade"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setIsMapFullScreen(false)}
      >
        <View className="flex-1 w-full h-full bg-[#0f172a] relative">
          <StatusBar style="light" />

          {/* Minimal Floating Exit Button */}
          <TouchableOpacity
            onPress={() => setIsMapFullScreen(false)}
            className="absolute top-3.5 right-14 z-50 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg shadow-md border border-slate-300/80 flex-row items-center"
            activeOpacity={0.85}
            accessibilityLabel="Exit Fullscreen"
          >
            <Ionicons name="contract" size={15} color="#0f172a" />
            <Text className="text-xs font-poppins-bold text-[#0f172a] ml-1">
              Exit
            </Text>
          </TouchableOpacity>

          {/* Fullscreen Map Canvas */}
          <View className="flex-1 w-full h-full">
            {isWeb ? (
              <iframe
                key={`map-fullscreen-${activeFilter}-${mapMode}`}
                title="Fullscreen Iligan Distribution Box Network Map"
                srcDoc={generateMapHtml()}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            ) : (
              <WebView
                key={`admin-map-webview-fullscreen-${activeFilter}-${mapMode}`}
                originWhitelist={['*']}
                source={{ html: generateMapHtml() }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'SELECT_PIN') {
                      const found = boxes.find((p) => p.id === data.pinId);
                      if (found) setSelectedPin(found);
                    }
                  } catch {
                    // Fallback
                  }
                }}
              />
            )}
          </View>

          {/* Floating Drawer if a Pin is Selected in Fullscreen */}
          {selectedPin && (
            <View className="absolute bottom-5 left-4 right-4 max-w-2xl mx-auto z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-2xl">
              <View className="flex-row items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <View className="flex-row items-center">
                  <View
                    className={`px-2.5 py-1 rounded-lg ${
                      getStatusColor(selectedPin.status).badgeClass
                    }`}
                  >
                    <Text className="text-xs font-poppins-bold text-white">
                      {selectedPin.code}
                    </Text>
                  </View>
                  <Text className="text-sm font-poppins-bold text-[#0f172a] ml-2">
                    {selectedPin.siteName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedPin(null)}
                  className="p-1 rounded-full bg-slate-100 hover:bg-slate-200"
                >
                  <Ionicons name="close" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
              <Text className="text-xs font-poppins-medium text-[#475569] mb-2" numberOfLines={1}>
                📍 {selectedPin.address}
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-poppins-semibold text-[#0f172a]">
                  {selectedPin.clientsCount} Accounts Connected
                </Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => setSelectedBoxForQR(selectedPin)}
                    className="bg-[#4d6029] px-3 py-1.5 rounded-lg flex-row items-center shadow-xs"
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="qrcode-scan" size={13} color="#ffffff" />
                    <Text className="text-white text-[11px] font-poppins-bold ml-1">
                      Print QR
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsMapFullScreen(false);
                      router.push('/admin/box-management' as any);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text className="text-[#334155] text-[11px] font-poppins-bold">
                      View Box Details →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
