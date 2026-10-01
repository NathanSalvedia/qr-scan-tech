import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { BOX_PINS, BoxPin } from "@/constants/distribution-boxes";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

type FilterType = "ALL" | "ACTIVE" | "NEEDS_TAG" | "ISSUE";

export default function UserMapScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [mapMode, setMapMode] = useState<"STREET_PINS" | "SATELLITE">(
    "STREET_PINS",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPin, setSelectedPin] = useState<BoxPin | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isWeb = Platform.OS === "web";

  const filteredPins = BOX_PINS.filter((pin) => {
    const matchesFilter = activeFilter === "ALL" || pin.status === activeFilter;
    const matchesSearch =
      pin.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pin.zone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Listen for pin clicks from Web iframe
  useEffect(() => {
    if (isWeb && typeof window !== "undefined") {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "SELECT_PIN") {
          const found = BOX_PINS.find((p) => p.id === event.data.pinId);
          if (found) {
            setSelectedPin(found);
          }
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [isWeb]);

  // Handle messages from native WebView
  const handleNativeMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "SELECT_PIN") {
        const found = BOX_PINS.find((p) => p.id === data.pinId);
        if (found) {
          setSelectedPin(found);
        }
      }
    } catch {
      // Ignore parse errors
    }
  };

  const getStatusColor = (status: BoxPin["status"]) => {
    switch (status) {
      case "ACTIVE":
        return {
          bg: "bg-[#4d6029]",
          lightBg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-[#4d6029]",
          badgeText: "text-white",
          label: "Tagged & Active",
          hex: "#4d6029",
        };
      case "NEEDS_TAG":
        return {
          bg: "bg-[#d97706]",
          lightBg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-700",
          badgeText: "text-white",
          label: "Needs QR Tag",
          hex: "#d97706",
        };
      case "ISSUE":
        return {
          bg: "bg-[#dc2626]",
          lightBg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
          badgeText: "text-white",
          label: "Degraded / Alarm",
          hex: "#dc2626",
        };
    }
  };

  // Generate interactive Leaflet Map HTML with Google Maps Tiles & Field Pins
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
          .custom-pin-badge:hover, .custom-pin-badge.selected {
            transform: translate(-50%, -108%) scale(1.1);
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
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
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
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
              notifySelection(pin.id);
            });
            markerGroup.addLayer(marker);
          });

          markerGroup.addTo(map);

          function fitMarkers() {
            if (pins.length > 0) {
              map.fitBounds(markerGroup.getBounds().pad(0.18));
            }
          }

          fitMarkers();

          setTimeout(function() {
            map.invalidateSize();
            fitMarkers();
          }, 200);
        </script>
      </body>
      </html>
    `;
  };

  const openDirections = (pin: BoxPin) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}&travelmode=driving`;
    if (isWeb) {
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
    } else {
      Linking.openURL(url).catch(() => {
        Linking.openURL(
          `geo:${pin.latitude},${pin.longitude}?q=${pin.latitude},${pin.longitude}(${pin.code})`,
        );
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />

      <View className="flex-1 flex-col h-full overflow-hidden">
        {/* HEADER & SEARCH BAR */}
        <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-2.5 z-30 shadow-xs">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                <Ionicons name="map" size={18} color="#4d6029" />
              </View>
              <View>
                <Text className="text-base font-poppins-bold text-[#0f172a]">
                  Distribution Box Map
                </Text>
                <Text className="text-[11px] font-poppins text-[#64748b]">
                  Iligan City Network Grid · {filteredPins.length} Nodes
                </Text>
              </View>
            </View>

            {/* Satellite / Street Switcher */}
            <TouchableOpacity
              onPress={() =>
                setMapMode(
                  mapMode === "STREET_PINS" ? "SATELLITE" : "STREET_PINS",
                )
              }
              className={`px-3 py-1.5 rounded-xl border flex-row items-center ${
                mapMode === "SATELLITE"
                  ? "bg-sky-600 border-sky-600"
                  : "bg-slate-100 border-slate-200"
              }`}
              activeOpacity={0.8}
            >
              <Ionicons
                name={mapMode === "SATELLITE" ? "map" : "earth"}
                size={14}
                color={mapMode === "SATELLITE" ? "#ffffff" : "#334155"}
              />
              <Text
                className={`text-xs font-poppins-bold ml-1.5 ${
                  mapMode === "SATELLITE" ? "text-white" : "text-[#334155]"
                }`}
              >
                {mapMode === "SATELLITE" ? "Street" : "Satellite"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box Input */}
          <View className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-row items-center mb-2.5">
            <Ionicons name="search" size={15} color="#64748b" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by box code (e.g. DB-MN-01), street, or zone..."
              placeholderTextColor="#94a3b8"
              className="flex-1 ml-2 text-xs font-poppins text-[#0f172a]"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-1.5"
          >
            <TouchableOpacity
              onPress={() => setActiveFilter("ALL")}
              className={`px-3 py-1.5 rounded-full border ${
                activeFilter === "ALL"
                  ? "bg-[#4d6029] border-[#4d6029]"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-[11px] font-poppins-bold ${
                  activeFilter === "ALL" ? "text-white" : "text-[#64748b]"
                }`}
              >
                All Boxes ({BOX_PINS.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-full border ${
                activeFilter === "ACTIVE"
                  ? "bg-[#4d6029] border-[#4d6029]"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-[11px] font-poppins-bold ${
                  activeFilter === "ACTIVE" ? "text-white" : "text-[#4d6029]"
                }`}
              >
                Tagged (4)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter("NEEDS_TAG")}
              className={`px-3 py-1.5 rounded-full border ${
                activeFilter === "NEEDS_TAG"
                  ? "bg-[#d97706] border-[#d97706]"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-[11px] font-poppins-bold ${
                  activeFilter === "NEEDS_TAG" ? "text-white" : "text-amber-700"
                }`}
              >
                Needs Tag (2)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter("ISSUE")}
              className={`px-3 py-1.5 rounded-full border ${
                activeFilter === "ISSUE"
                  ? "bg-[#dc2626] border-[#dc2626]"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`text-[11px] font-poppins-bold ${
                  activeFilter === "ISSUE" ? "text-white" : "text-rose-700"
                }`}
              >
                Issues (1)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* FULL INTERACTIVE GOOGLE MAP CONTAINER */}
        <View className="flex-1 relative bg-[#e2e8f0] overflow-hidden">
          {isWeb ? (
            <iframe
              key={`user-map-${activeFilter}-${mapMode}`}
              title="Technician Distribution Box Map"
              srcDoc={generateMapHtml()}
              style={{
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          ) : (
            <WebView
              key={`native-user-map-${activeFilter}-${mapMode}`}
              originWhitelist={["*"]}
              source={{ html: generateMapHtml() }}
              onMessage={handleNativeMessage}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
            />
          )}

          {/* BOTTOM SELECTED PIN SLIDE-UP PREVIEW CARD */}
          {selectedPin && (
            <View className="absolute bottom-3 left-3 right-3 bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 z-30">
              <View className="flex-row items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                <View className="flex-row items-center">
                  <Text className="text-base font-mono font-bold text-[#0f172a]">
                    {selectedPin.code}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-md ml-2.5 ${
                      getStatusColor(selectedPin.status).lightBg
                    } border ${getStatusColor(selectedPin.status).border}`}
                  >
                    <Text
                      className={`text-[10px] font-poppins-bold ${
                        getStatusColor(selectedPin.status).text
                      }`}
                    >
                      {getStatusColor(selectedPin.status).label}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedPin(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Site Name & Address */}
              <Text className="text-xs font-poppins-bold text-[#0f172a] mb-0.5">
                {selectedPin.siteName}
              </Text>
              <Text className="text-[11px] font-poppins text-[#64748b] mb-3">
                {selectedPin.address} · {selectedPin.zone}
              </Text>

              {/* Telecom Quick Metrics */}
              <View className="flex-row bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-3 justify-between">
                <View className="items-center flex-1">
                  <Text className="text-[10px] font-poppins text-[#64748b]">
                    Ports
                  </Text>
                  <Text className="text-xs font-mono font-bold text-[#0f172a]">
                    {selectedPin.portsUsed}/{selectedPin.totalPorts}
                  </Text>
                </View>
                <View className="w-px bg-slate-200 h-full" />
                <View className="items-center flex-1">
                  <Text className="text-[10px] font-poppins text-[#64748b]">
                    Loss
                  </Text>
                  <Text className="text-xs font-mono font-bold text-[#0f172a]">
                    {selectedPin.opticalLoss.split(" ")[0]}
                  </Text>
                </View>
                <View className="w-px bg-slate-200 h-full" />
                <View className="items-center flex-1">
                  <Text className="text-[10px] font-poppins text-[#64748b]">
                    Breaker
                  </Text>
                  <Text className="text-xs font-mono font-bold text-[#0f172a]">
                    {selectedPin.circuitBreaker.split(" ")[0]}
                  </Text>
                </View>
                <View className="w-px bg-slate-200 h-full" />
                <View className="items-center flex-1">
                  <Text className="text-[10px] font-poppins text-[#64748b]">
                    Temp
                  </Text>
                  <Text
                    className={`text-xs font-mono font-bold ${
                      selectedPin.status === "ISSUE"
                        ? "text-rose-600"
                        : "text-[#0f172a]"
                    }`}
                  >
                    {selectedPin.temperature.split(" ")[0]}°C
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => router.push("/user/scanner")}
                  className="flex-1 bg-[#4d6029] py-2.5 rounded-xl flex-row items-center justify-center shadow-xs active:opacity-90"
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={15}
                    color="#ffffff"
                  />
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    Scan Box QR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openDirections(selectedPin)}
                  className="bg-sky-600 py-2.5 px-3.5 rounded-xl flex-row items-center justify-center active:opacity-90"
                >
                  <Ionicons name="navigate" size={14} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    Directions
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDetailModal(true)}
                  className="bg-slate-100 border border-slate-200 py-2.5 px-3 rounded-xl flex-row items-center justify-center active:opacity-90"
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#334155"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* DETAILED BOX SPECIFICATIONS MODAL */}
        <Modal
          visible={showDetailModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[85%] flex-col">
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                    <MaterialCommunityIcons
                      name="cube-outline"
                      size={20}
                      color="#4d6029"
                    />
                  </View>
                  <View>
                    <Text className="text-base font-mono font-bold text-[#0f172a]">
                      {selectedPin?.code}
                    </Text>
                    <Text className="text-[11px] font-poppins text-[#64748b]">
                      {selectedPin?.tier}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setShowDetailModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {selectedPin && (
                <ScrollView
                  className="flex-1 my-3"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Location & Parent */}
                  <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-3">
                    <Text className="text-[10px] font-poppins-bold text-[#64748b] uppercase tracking-wider mb-1">
                      Installation Site
                    </Text>
                    <Text className="text-xs font-poppins-bold text-[#0f172a] mb-0.5">
                      {selectedPin.siteName}
                    </Text>
                    <Text className="text-[11px] font-poppins text-[#64748b] mb-2">
                      {selectedPin.address}
                    </Text>

                    <View className="flex-row justify-between pt-2 border-t border-slate-200/60">
                      <Text className="text-[11px] font-poppins text-[#64748b]">
                        Parent Upstream Node:
                      </Text>
                      <Text className="text-[11px] font-mono font-bold text-[#0f172a]">
                        {selectedPin.parentCode || "Root Feeder Node"}
                      </Text>
                    </View>
                  </View>

                  {/* Electrical & Optical Specs */}
                  <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-3">
                    <Text className="text-[10px] font-poppins-bold text-[#64748b] uppercase tracking-wider mb-2">
                      Field Diagnostics & Metrics
                    </Text>
                    <View className="space-y-1.5">
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-poppins text-[#64748b]">
                          Optical Loss:
                        </Text>
                        <Text className="text-xs font-mono font-bold text-[#0f172a]">
                          {selectedPin.opticalLoss}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-poppins text-[#64748b]">
                          Port Capacity:
                        </Text>
                        <Text className="text-xs font-mono font-bold text-[#0f172a]">
                          {selectedPin.portsUsed} / {selectedPin.totalPorts}{" "}
                          Assigned
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-poppins text-[#64748b]">
                          Circuit Breaker:
                        </Text>
                        <Text className="text-xs font-mono font-bold text-[#0f172a]">
                          {selectedPin.circuitBreaker}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-poppins text-[#64748b]">
                          Line Voltage:
                        </Text>
                        <Text className="text-xs font-mono font-bold text-[#0f172a]">
                          {selectedPin.voltage}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs font-poppins text-[#64748b]">
                          Operating Temp:
                        </Text>
                        <Text
                          className={`text-xs font-mono font-bold ${
                            selectedPin.status === "ISSUE"
                              ? "text-rose-600"
                              : "text-[#0f172a]"
                          }`}
                        >
                          {selectedPin.temperature}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Hardware Equipment Items */}
                  <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-3">
                    <Text className="text-[10px] font-poppins-bold text-[#64748b] uppercase tracking-wider mb-2">
                      Internal Equipment Checklist
                    </Text>
                    {selectedPin.equipmentItems.map((item, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center mb-1.5 last:mb-0"
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#4d6029"
                        />
                        <Text className="text-xs font-poppins text-[#334155] ml-2">
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Audit Trail */}
                  <View className="p-3 bg-slate-100 rounded-xl">
                    <Text className="text-[10px] font-poppins text-[#64748b]">
                      Last Verified By:{" "}
                      <Text className="font-poppins-bold text-[#0f172a]">
                        {selectedPin.lastScannedBy}
                      </Text>{" "}
                      ({selectedPin.lastScannedAt})
                    </Text>
                  </View>
                </ScrollView>
              )}

              {/* Modal Bottom Actions */}
              <View className="pt-3 border-t border-slate-100 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setShowDetailModal(false);
                    router.push("/user/scanner");
                  }}
                  className="flex-1 bg-[#4d6029] py-3 rounded-xl flex-row items-center justify-center shadow-xs"
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={15}
                    color="#ffffff"
                  />
                  <Text className="text-xs font-poppins-bold text-white ml-2">
                    Launch QR Scanner
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (selectedPin) openDirections(selectedPin);
                  }}
                  className="bg-sky-600 py-3 px-4 rounded-xl flex-row items-center justify-center"
                >
                  <Ionicons name="navigate" size={15} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    Navigate
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* BOTTOM USER NAVIGATION */}
        <UserBottomNavigation activeRoute="/user/map" />
      </View>
    </SafeAreaView>
  );
}
