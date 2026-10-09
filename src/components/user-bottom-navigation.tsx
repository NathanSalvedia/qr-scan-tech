import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

export type UserTabRoute =
  | "/user/dashboard"
  | "/user/map"
  | "/user/scanner"
  | "/user/boxes"
  | "/user/profile";

interface UserBottomNavigationProps {
  activeRoute: UserTabRoute;
}

export function UserBottomNavigation({
  activeRoute,
}: UserBottomNavigationProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [navWidth, setNavWidth] = useState<number>(windowWidth);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== navWidth) {
      setNavWidth(width);
    }
  };

  const barHeight = 78;
  const w = navWidth || windowWidth || 380;
  const cx = w / 2;

  // Smooth top corner radius
  const rCorner = 20;

  // Wide, smooth U-cradle cutout framing the extra large circular button
  // The cutout dips from cx - 56 down to y = 68px with a clean 6px clearance around the 70px button
  const cutoutPath = `
    M 0 ${rCorner}
    Q 0 0 ${rCorner} 0
    L ${cx - 56} 0
    C ${cx - 46} 0, ${cx - 40} 24, ${cx - 36} 42
    C ${cx - 32} 60, ${cx - 16} 68, ${cx} 68
    C ${cx + 16} 68, ${cx + 32} 60, ${cx + 36} 42
    C ${cx + 40} 24, ${cx + 46} 0, ${cx + 56} 0
    L ${w - rCorner} 0
    Q ${w} 0 ${w} ${rCorner}
    L ${w} ${barHeight}
    L 0 ${barHeight}
    Z
  `;

  // Top contour stroke line with crisp definition
  const borderStrokePath = `
    M 0 ${rCorner}
    Q 0 0 ${rCorner} 0
    L ${cx - 56} 0
    C ${cx - 46} 0, ${cx - 40} 24, ${cx - 36} 42
    C ${cx - 32} 60, ${cx - 16} 68, ${cx} 68
    C ${cx + 16} 68, ${cx + 32} 60, ${cx + 36} 42
    C ${cx + 40} 24, ${cx + 46} 0, ${cx + 56} 0
    L ${w - rCorner} 0
    Q ${w} 0 ${w} ${rCorner}
  `;

  const navigateTo = (route: UserTabRoute) => {
    if (activeRoute !== route) {
      router.replace(route);
    }
  };

  return (
    <View
      onLayout={handleLayout}
      className="relative w-full z-40 bg-transparent"
      style={{
        height: barHeight,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 14,
      }}
    >
      {/* SVG Background Layer with Rounded Top Corners & Deep Center Cradle */}
      <View className="absolute inset-0 z-0">
        <Svg
          width={w}
          height={barHeight}
          viewBox={`0 0 ${w} ${barHeight}`}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <Path d={cutoutPath} fill="#ffffff" />
          <Path
            d={borderStrokePath}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
        </Svg>
      </View>

      {/* Extra Large Floating Action Button (FAB) with Bold Borderline Circle */}
      <View
        className="absolute z-30 items-center justify-center pointer-events-box-none"
        style={{
          left: cx - 35,
          top: -8,
          width: 70,
          height: 70,
        }}
      >
        <TouchableOpacity
          onPress={() => navigateTo("/user/scanner")}
          className={`w-[70px] h-[70px] rounded-full items-center justify-center active:scale-95 transition-all border-[4px] border-white ${
            activeRoute === "/user/scanner" ? "bg-[#3a481f]" : "bg-[#4d6029]"
          }`}
          style={{
            shadowColor: "#4d6029",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 14,
          }}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Launch QR Scanner"
        >
          <MaterialCommunityIcons
            name="qrcode-scan"
            size={35}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>

      {/* 4 Standard Nav Tabs (2 on Left, 2 on Right) */}
      <View className="w-full h-full flex-row items-center justify-between px-3 pt-2 pb-2 z-10">
        {/* LEFT GROUP: Home & Map */}
        <View className="flex-row items-center justify-around flex-1 pr-3">
          {/* 1. Home */}
          <TouchableOpacity
            onPress={() => navigateTo("/user/dashboard")}
            className="items-center justify-center py-1 px-2 flex-1 active:opacity-75"
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityLabel="Home Dashboard"
          >
            <Ionicons
              name={activeRoute === "/user/dashboard" ? "home" : "home-outline"}
              size={23}
              color={activeRoute === "/user/dashboard" ? "#4d6029" : "#64748b"}
            />
            <Text
              className={`text-[10px] mt-0.5 ${
                activeRoute === "/user/dashboard"
                  ? "text-[#4d6029] font-poppins-bold"
                  : "text-[#64748b] font-poppins-medium"
              }`}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* 2. Map */}
          <TouchableOpacity
            onPress={() => navigateTo("/user/map")}
            className="items-center justify-center py-1 px-2 flex-1 active:opacity-75"
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityLabel="Field Map"
          >
            <Ionicons
              name={activeRoute === "/user/map" ? "map" : "map-outline"}
              size={23}
              color={activeRoute === "/user/map" ? "#4d6029" : "#64748b"}
            />
            <Text
              className={`text-[10px] mt-0.5 ${
                activeRoute === "/user/map"
                  ? "text-[#4d6029] font-poppins-bold"
                  : "text-[#64748b] font-poppins-medium"
              }`}
            >
              Map
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center Spacer for Extra Large Deep Cutout & FAB */}
        <View style={{ width: 78 }} />

        {/* RIGHT GROUP: Boxes & Menu */}
        <View className="flex-row items-center justify-around flex-1 pl-3">
          {/* 3. Boxes */}
          <TouchableOpacity
            onPress={() => navigateTo("/user/boxes")}
            className="items-center justify-center py-1 px-2 flex-1 active:opacity-75"
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityLabel="Distribution Boxes"
          >
            <Ionicons
              name={
                activeRoute === "/user/boxes" ? "archive" : "archive-outline"
              }
              size={23}
              color={activeRoute === "/user/boxes" ? "#4d6029" : "#64748b"}
            />
            <Text
              className={`text-[10px] mt-0.5 ${
                activeRoute === "/user/boxes"
                  ? "text-[#4d6029] font-poppins-bold"
                  : "text-[#64748b] font-poppins-medium"
              }`}
            >
              Boxes
            </Text>
          </TouchableOpacity>

          {/* 4. Menu */}
          <TouchableOpacity
            onPress={() => navigateTo("/user/profile")}
            className="items-center justify-center py-1 px-2 flex-1 active:opacity-75"
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityLabel="Menu and Settings"
          >
            <Ionicons
              name="menu-outline"
              size={24}
              color={activeRoute === "/user/profile" ? "#4d6029" : "#64748b"}
            />
            <Text
              className={`text-[10px] mt-0.5 ${
                activeRoute === "/user/profile"
                  ? "text-[#4d6029] font-poppins-bold"
                  : "text-[#64748b] font-poppins-medium"
              }`}
            >
              Menu
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
