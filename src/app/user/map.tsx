import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { boxService } from "@/services/boxes";

export interface UserMapPin {
  id: string;
  code: string;
  category: "MAIN_BOX" | "SUB_BOX";
  status: "ACTIVE" | "NEEDS_TAG" | "ISSUE";
  siteName: string;
  address: string;
  parentCode?: string | null;
  equipmentItems: string[];
  clientsCount: number;
  latitude: number;
  longitude: number;
  zone: string;
  tier: string;
  portsUsed: number;
  totalPorts: number;
  opticalLoss: string;
  circuitBreaker: string;
  voltage: string;
  temperature: string;
  lastScannedBy?: string | null;
  lastScannedAt?: string | null;
  latestIssue?: {
    notes: string;
    reportedBy?: string;
    reportedAt?: string;
  } | null;
}

type FilterType = "ALL" | "ACTIVE" | "NEEDS_TAG" | "ISSUE";

export default function UserMapScreen() {
  const insets = useSafeAreaInsets();
  const [boxes, setBoxes] = useState<UserMapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [mapMode, setMapMode] = useState<"STREET_PINS" | "SATELLITE">(
    "STREET_PINS",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPin, setSelectedPin] = useState<UserMapPin | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fullscreen map state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const webViewRef = useRef<WebView | null>(null);
  const iframeRef = useRef<any>(null);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      const msg = { type: "SET_FULLSCREEN", isFullscreen: next };
      if (isWeb) {
        iframeRef.current?.contentWindow?.postMessage(msg, "*");
      } else {
        webViewRef.current?.postMessage(JSON.stringify(msg));
      }
      return next;
    });
  };

  const isWeb = Platform.OS === "web";

  const fetchMapBoxes = useCallback(async () => {
    try {
      const res = await boxService.getAll();
      if (res.success && Array.isArray(res.boxes)) {
        const mapped: UserMapPin[] = res.boxes.map((b: any) => ({
          id: String(b.id),
          code: String(b.code || "BOX"),
          category: b.category === "MAIN_BOX" ? "MAIN_BOX" : "SUB_BOX",
          status:
            b.status === "ACTIVE" ||
            b.status === "NEEDS_TAG" ||
            b.status === "ISSUE"
              ? b.status
              : "ACTIVE",
          siteName: String(b.siteName || "Distribution Site"),
          address: String(b.address || "Iligan City"),
          parentCode: b.parentCode || null,
          equipmentItems: Array.isArray(b.equipmentItems)
            ? b.equipmentItems
            : Array.isArray(b.equipment)
            ? b.equipment.map((e: any) =>
                typeof e === "string" ? e : e.name || "Equipment",
              )
            : ["Optical Splitter", "Terminal Block"],
          clientsCount: Number(b.clientsCount ?? b.clients?.length ?? 0),
          latitude: Number(b.latitude) || 8.232,
          longitude: Number(b.longitude) || 124.248,
          zone: String(b.zone || "Poblacion"),
          tier: String(
            b.tier ||
              (b.category === "MAIN_BOX"
                ? "Tier 1 · Main Feeder"
                : "Tier 2 · Sub-Distribution"),
          ),
          portsUsed: Number(b.portsUsed ?? b.activePorts ?? 0),
          totalPorts: Number(b.totalPorts ?? 24),
          opticalLoss: String(b.opticalLoss || "-18.5 dBm"),
          circuitBreaker: String(b.circuitBreaker || "20A 1P MCB"),
          voltage: String(b.voltage || "228.4 V"),
          temperature: String(b.temperature || "31.2 °C"),
          lastScannedBy: b.lastScannedBy ? String(b.lastScannedBy) : "Unverified",
          lastScannedAt: b.lastScannedAt
            ? String(b.lastScannedAt)
            : "Pending Field Audit",
          latestIssue: b.latestIssue || null,
        }));
        return { boxes: mapped, error: null };
      }
      return { boxes: [], error: res.message || "Failed to load map nodes" };
    } catch (err: any) {
      return {
        boxes: [],
        error: err.message || "Network error loading map nodes",
      };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const { boxes: fetched, error: fetchErr } = await fetchMapBoxes();
        if (!isMounted) return;
        if (fetched) setBoxes(fetched);
        if (fetchErr) setError(fetchErr);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchMapBoxes]);

  const filteredPins = boxes.filter((pin) => {
    const matchesFilter = activeFilter === "ALL" || pin.status === activeFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      pin.code.toLowerCase().includes(query) ||
      pin.siteName.toLowerCase().includes(query) ||
      pin.address.toLowerCase().includes(query) ||
      pin.zone.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const activeCount = boxes.filter((b) => b.status === "ACTIVE").length;
  const needsTagCount = boxes.filter((b) => b.status === "NEEDS_TAG").length;
  const issueCount = boxes.filter((b) => b.status === "ISSUE").length;

  // Listen for pin clicks from Web iframe
  useEffect(() => {
    if (isWeb && typeof window !== "undefined") {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "SELECT_PIN") {
          const found = boxes.find((p) => p.id === event.data.pinId);
          if (found) {
            setSelectedPin(found);
          }
        } else if (event.data?.type === "LAYER_CHANGED") {
          setMapMode(event.data.mode);
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [isWeb, boxes]);

  // Handle messages from native WebView
  const handleNativeMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "SELECT_PIN") {
        const found = boxes.find((p) => p.id === data.pinId);
        if (found) {
          setSelectedPin(found);
        }
      } else if (data?.type === "LAYER_CHANGED") {
        setMapMode(data.mode);
      }
    } catch {
      // Ignore parse errors
    }
  };

  const getStatusColor = (status: UserMapPin["status"]) => {
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
          
          /* Hide default Leaflet Zoom (+/-) */
          .leaflet-control-zoom {
            display: none !important;
          }

          /* Top control positioning */
          .leaflet-top {
            top: 12px !important;
            right: 12px !important;
            transition: top 0.2s ease;
          }
          body.fullscreen-mode .leaflet-top {
            top: ${Math.max(Math.round(insets.top || 0), 16) + 6}px !important;
            right: 12px !important;
          }

          /* Custom styling for Leaflet Layers Control matching Image 2 & Image 3 */
          .leaflet-control-layers {
            border-radius: 12px !important;
            border: 1px solid rgba(0, 0, 0, 0.08) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16) !important;
            background: #ffffff !important;
            transition: all 0.2s ease;
          }

          .leaflet-control-layers-toggle {
            width: 40px !important;
            height: 40px !important;
            background-size: 22px 22px !important;
            background-position: center !important;
            border-radius: 12px !important;
          }

          .leaflet-control-layers-expanded {
            padding: 8px 12px !important;
            min-width: 144px !important;
            border-radius: 12px !important;
            background: #ffffff !important;
          }

          .leaflet-control-layers-base {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
          }

          .leaflet-control-layers-base label {
            display: flex !important;
            align-items: center !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            color: #1e293b !important;
            cursor: pointer !important;
            margin: 0 !important;
            padding: 3px 2px !important;
          }

          .leaflet-control-layers-base label > div {
            display: flex !important;
            align-items: center !important;
          }

          .leaflet-control-layers-selector {
            margin: 0 8px 0 0 !important;
            accent-color: #2563eb !important;
            cursor: pointer !important;
            width: 16px !important;
            height: 16px !important;
          }
        </style>
      </head>
      <body class="${isFullscreen ? "fullscreen-mode" : ""}">
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
            zoomControl: false
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

          // Layer Control configured with exact labels from Image 3
          var baseLayers = {
            "Google Streets": googleStreet,
            "Google Satellite": googleHybrid
          };

          var layerControl = L.control.layers(baseLayers, null, {
            position: 'topright',
            collapsed: true
          }).addTo(map);

          // Synchronize React Native state when layer is clicked in Leaflet
          map.on('baselayerchange', function(e) {
            var mode = e.name === 'Google Satellite' ? 'SATELLITE' : 'STREET_PINS';
            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage({ type: 'LAYER_CHANGED', mode: mode }, '*');
            }
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LAYER_CHANGED', mode: mode }));
            }
          });

          // Mobile touch toggle helper: tap toggle button to open/close, tap map to close
          var layersContainer = layerControl.getContainer();
          var toggleBtn = layersContainer ? layersContainer.querySelector('.leaflet-control-layers-toggle') : null;
          if (toggleBtn) {
            L.DomEvent.on(toggleBtn, 'click', function(e) {
              L.DomEvent.stop(e);
              if (layersContainer.classList.contains('leaflet-control-layers-expanded')) {
                layerControl.collapse();
              } else {
                layerControl.expand();
              }
            });
          }
          map.on('click', function() {
            layerControl.collapse();
          });

          // Dynamic layer switching without reloading page or losing pan/zoom
          function setMapLayer(mode) {
            if (mode === 'SATELLITE') {
              if (map.hasLayer(googleStreet)) map.removeLayer(googleStreet);
              if (!map.hasLayer(googleHybrid)) googleHybrid.addTo(map);
            } else {
              if (map.hasLayer(googleHybrid)) map.removeLayer(googleHybrid);
              if (!map.hasLayer(googleStreet)) googleStreet.addTo(map);
            }
          }

          function handleModeMessage(event) {
            var data = event.data;
            if (typeof data === 'string') {
              try { data = JSON.parse(data); } catch(e) {}
            }
            if (data && data.type === 'SET_MAP_MODE') {
              setMapLayer(data.mode);
            }
            if (data && data.type === 'SET_FULLSCREEN') {
              if (data.isFullscreen) {
                document.body.classList.add('fullscreen-mode');
              } else {
                document.body.classList.remove('fullscreen-mode');
              }
              setTimeout(function() {
                map.invalidateSize();
              }, 150);
            }
          }

          window.addEventListener('message', handleModeMessage);
          document.addEventListener('message', handleModeMessage);

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

          function fitMarkers() {
            if (pins.length > 0) {
              map.fitBounds(markerGroup.getBounds().pad(0.18), { maxZoom: 17 });
            }
          }

          fitMarkers();

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
    <SafeAreaView
      edges={isFullscreen ? ["left", "right"] : ["top", "left", "right"]}
      className="flex-1 bg-[#f8fafc]"
    >
      <StatusBar
        style={isFullscreen && mapMode === "SATELLITE" ? "light" : "dark"}
      />

      <View className="flex-1 flex-col h-full overflow-hidden">
        {/* HEADER & SEARCH BAR (Hidden in fullscreen mode) */}
        {!isFullscreen && (
          <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-2.5 z-30 shadow-xs">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-8 h-8 rounded-xl bg-[#4d6029]/10 items-center justify-center mr-2.5">
                  <Ionicons name="map" size={18} color="#4d6029" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-poppins-bold text-[#0f172a]"
                    numberOfLines={1}
                  >
                    Distribution Box Map
                  </Text>
                  <Text
                    className="text-[11px] font-poppins text-[#64748b]"
                    numberOfLines={1}
                  >
                    Iligan City Network Grid · {filteredPins.length} Nodes
                  </Text>
                </View>
              </View>

              {/* Full Screen Toggle Button */}
              <TouchableOpacity
                onPress={toggleFullscreen}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 items-center justify-center active:bg-slate-100"
                activeOpacity={0.8}
                accessibilityLabel="Full Screen Map"
              >
                <MaterialCommunityIcons
                  name="fullscreen"
                  size={20}
                  color="#334155"
                />
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
                  All Boxes ({boxes.length})
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
                  Tagged ({activeCount})
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
                  Needs Tag ({needsTagCount})
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
                  Issues ({issueCount})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* FULL INTERACTIVE GOOGLE MAP CONTAINER */}
        <View className="flex-1 relative bg-[#e2e8f0] overflow-hidden">
          {loading && boxes.length === 0 && (
            <View className="absolute inset-0 z-20 bg-white/80 items-center justify-center">
              <ActivityIndicator size="large" color="#4d6029" />
              <Text className="text-xs font-poppins-medium text-slate-600 mt-2">
                Loading network grid nodes...
              </Text>
            </View>
          )}

          {!loading && boxes.length === 0 && (
            <View className="absolute top-4 left-4 right-4 z-20 bg-white/95 rounded-2xl p-4 shadow-md border border-slate-200 items-center">
              <Text className="text-xs font-poppins-bold text-[#0f172a]">
                No distribution boxes found
              </Text>
              <Text className="text-[11px] font-poppins text-slate-500 text-center mt-0.5">
                {error || "Registered distribution boxes will appear on this map."}
              </Text>
            </View>
          )}

          {/* Floating Exit Fullscreen Button (Fullscreen mode) */}
          {isFullscreen && (
            <TouchableOpacity
              onPress={toggleFullscreen}
              style={{ top: Math.max(insets.top, 16) + 6 }}
              className="absolute left-3 z-30 flex-row items-center bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/90 shadow-md active:opacity-80"
              activeOpacity={0.8}
              accessibilityLabel="Exit Fullscreen"
            >
              <MaterialCommunityIcons
                name="fullscreen-exit"
                size={18}
                color="#0f172a"
              />
              <Text className="text-xs font-poppins-bold text-[#0f172a] ml-1.5">
                Exit Fullscreen
              </Text>
            </TouchableOpacity>
          )}

          {isWeb ? (
            <iframe
              ref={iframeRef}
              key={`user-map-${activeFilter}-${boxes.length}`}
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
              ref={webViewRef}
              key={`native-user-map-${activeFilter}-${boxes.length}`}
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
            <View
              style={{
                bottom: isFullscreen ? Math.max(insets.bottom, 12) + 6 : 12,
              }}
              className="absolute left-3 right-3 bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 z-30"
            >
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
              <Text className="text-[11px] font-poppins text-[#64748b] mb-3.5">
                {selectedPin.address} · {selectedPin.zone}
              </Text>

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
                  {/* Active Hardware Issue Alert */}
                  {selectedPin.status === "ISSUE" && (
                    <View className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-3">
                      <View className="flex-row items-center mb-1">
                        <Ionicons name="warning" size={15} color="#dc2626" />
                        <Text className="text-xs font-poppins-bold text-rose-900 ml-1.5">
                          Active Hardware Issue Reported
                        </Text>
                      </View>
                      <Text className="text-[11px] font-poppins text-rose-700">
                        {selectedPin.latestIssue?.notes ||
                          "Physical damage or component fault observed during field inspection. Inspection/repair required."}
                      </Text>
                      {selectedPin.latestIssue?.reportedBy && (
                        <Text className="text-[10px] font-poppins text-rose-500 mt-1">
                          Reported by {selectedPin.latestIssue.reportedBy} ·{" "}
                          {selectedPin.latestIssue.reportedAt}
                        </Text>
                      )}
                    </View>
                  )}

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
                    </View>
                  </View>

                  {/* Hardware Equipment Items */}
                  <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-3">
                    <Text className="text-[10px] font-poppins-bold text-[#64748b] uppercase tracking-wider mb-2">
                      Internal Equipment Checklist
                    </Text>
                    {(selectedPin.equipmentItems || []).map((item, idx) => (
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
                        {selectedPin.lastScannedBy || "Unverified"}
                      </Text>{" "}
                      ({selectedPin.lastScannedAt || "Pending Field Audit"})
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
                  className="w-full bg-[#4d6029] py-3 rounded-xl flex-row items-center justify-center shadow-xs active:opacity-90"
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={16}
                    color="#ffffff"
                  />
                  <Text className="text-sm font-poppins-bold text-white ml-2">
                    Launch QR Scanner
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* BOTTOM USER NAVIGATION (Hidden in fullscreen mode) */}
        {!isFullscreen && <UserBottomNavigation activeRoute="/user/map" />}
      </View>
    </SafeAreaView>
  );
}
