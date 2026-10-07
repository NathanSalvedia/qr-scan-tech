import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SidebarNavigation } from '@/components/sidebar-navigation';

import { useDashboardData } from '@/hooks/useDashboardData';
import type { BoxData } from '@/services/dashboard';

type FilterType = 'ALL' | 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE';

export default function AdminDashboardScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [selectedPin, setSelectedPin] = useState<BoxData | null>(null);
  const [selectedBoxForQR, setSelectedBoxForQR] = useState<BoxData | null>(null);
  const [mapMode, setMapMode] = useState<'STREET_PINS' | 'SATELLITE'>('STREET_PINS');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isWeb = Platform.OS === 'web';

  const { stats, boxes, loading, refresh } = useDashboardData();

  const filteredPins = boxes.filter((pin) => {
    if (activeFilter === 'ACTIVE') return pin.status === 'ACTIVE';
    if (activeFilter === 'NEEDS_TAG') return pin.status === 'NEEDS_TAG';
    if (activeFilter === 'ISSUE') return pin.status === 'ISSUE';
    return true;
  });

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
          * { box-sizing: border-box; }
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #e2e8f0; }
          .custom-pin-badge {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transform: translate(-50%, -100%);
            transition: transform 0.15s ease, filter 0.15s ease;
          }
          .custom-pin-badge:hover {
            transform: translate(-50%, -108%) scale(1.08);
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));
            z-index: 1000 !important;
          }
          .pin-pill {
            padding: 4px 9px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 11px;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            gap: 4px;
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
          }
          .pin-sublabel {
            background: rgba(255, 255, 255, 0.95);
            color: #0f172a;
            font-size: 9.5px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 6px;
            margin-top: 3px;
            border: 1px solid rgba(0,0,0,0.12);
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            white-space: nowrap;
            max-width: 140px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          /* Custom Google Style Zoom Control */
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
            border-radius: 8px !important;
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
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map centered on Iligan City center
          var map = L.map('map', {
            center: [8.2320, 124.2480],
            zoom: 14,
            zoomControl: true
          });

          // Primary Google Maps Street Layer
          var googleStreet = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: 'Map data &copy; Google'
          });

          // Google Maps Satellite + Streets Hybrid Layer
          var googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: 'Imagery &copy; Google'
          });

          // OpenStreetMap Fallback Layer
          var osmStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          });

          var activeMode = '${mapMode}';
          if (activeMode === 'SATELLITE') {
            googleHybrid.addTo(map);
          } else {
            googleStreet.addTo(map);
          }

          var baseLayers = {
            "Google Streets": googleStreet,
            "Google Satellite": googleHybrid,
            "OpenStreetMap": osmStandard
          };
          L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

          var pins = ${JSON.stringify(filteredPins)};
          var markerGroup = L.featureGroup();

          pins.forEach(function(pin) {
            var statusClass = pin.status === 'ACTIVE' ? 'active' : (pin.status === 'NEEDS_TAG' ? 'needs-tag' : 'issue');
            var icon = L.divIcon({
              className: 'custom-pin-container',
              html: '<div class="custom-pin-badge">' +
                      '<div class="pin-pill ' + statusClass + '">' +
                        '<span class="pin-dot"></span>' +
                        '<span>' + pin.code + '</span>' +
                      '</div>' +
                      '<div class="pin-sublabel">' + pin.siteName.split('-')[0].split('/')[0].trim() + '</div>' +
                    '</div>',
              iconSize: [80, 46],
              iconAnchor: [40, 46]
            });

            var marker = L.marker([pin.latitude, pin.longitude], { icon: icon });
            marker.on('click', function() {
              window.parent.postMessage({ type: 'SELECT_PIN', pinId: pin.id }, '*');
            });
            markerGroup.addLayer(marker);
          });

          markerGroup.addTo(map);

          // Auto-fit to markers with padding
          function fitMarkers() {
            if (pins.length > 0) {
              map.fitBounds(markerGroup.getBounds().pad(0.18));
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
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
                        {stats?.highTempAlerts ?? 0} High Temp
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-poppins text-[#94a3b8]" numberOfLines={1}>
                    {stats?.portDegraded ?? 0} Port degraded
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
                  <View className="flex-1 items-center justify-center p-6 bg-slate-100">
                    <Ionicons name="map" size={48} color="#4d6029" />
                    <Text className="text-sm font-poppins-bold text-[#0f172a] mt-2">
                      Iligan City Distribution Box Network
                    </Text>
                    <Text className="text-xs font-poppins text-[#64748b] text-center mt-1">
                      {boxes.length} Nodes across distribution network
                    </Text>
                  </View>
                )}
              </View>

              {/* Map Footer Bar with Quick Box Jump Pills */}
              <View className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex-row items-center justify-between flex-wrap gap-2">
                <View className="flex-row items-center">
                  <Ionicons name="navigate-circle-outline" size={16} color="#4d6029" />
                  <Text className="text-xs font-poppins-semibold text-[#475569] ml-1.5 mr-2">
                    Quick Jump to Box:
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5">
                  {boxes.length === 0 ? (
                    <Text className="text-xs font-poppins text-slate-400 py-1">
                      No distribution boxes found
                    </Text>
                  ) : (
                    boxes.map((pin) => (
                    <TouchableOpacity
                      key={pin.id}
                      onPress={() => setSelectedPin(pin)}
                      className={`px-2.5 py-1 rounded-lg border flex-row items-center mr-1.5 ${
                        selectedPin?.id === pin.id
                          ? 'bg-[#4d6029] border-[#4d6029]'
                          : 'bg-white border-slate-200 hover:bg-slate-100'
                      }`}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-2 h-2 rounded-full mr-1.5 ${
                          pin.status === 'ACTIVE'
                            ? 'bg-emerald-500'
                            : pin.status === 'NEEDS_TAG'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <Text
                        className={`text-[11px] font-poppins-bold ${
                          selectedPin?.id === pin.id ? 'text-white' : 'text-[#334155]'
                        }`}
                      >
                        {pin.code}
                      </Text>
                    </TouchableOpacity>
                  )))}
                </ScrollView>
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

                {/* QR Code Graphic */}
                <View className="w-36 h-36 bg-[#f8fafc] border border-slate-200 rounded-2xl items-center justify-center p-2 mb-3 shadow-inner">
                  <MaterialCommunityIcons name="qrcode" size={110} color="#0f172a" />
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
    </SafeAreaView>
  );
}
