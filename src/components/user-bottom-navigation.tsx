import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

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
  return (
    <View className="bg-white border-t border-slate-200/90 px-3 py-2 flex-row items-center justify-around shadow-lg shadow-slate-900/10 z-40">
      {/* 1. Home / Dashboard */}
      <TouchableOpacity
        onPress={() => {
          if (activeRoute !== "/user/dashboard") {
            router.push("/user/dashboard");
          }
        }}
        className="items-center justify-center py-1 px-2 flex-1"
        activeOpacity={0.75}
      >
        <Ionicons
          name={activeRoute === "/user/dashboard" ? "home" : "home-outline"}
          size={22}
          color={activeRoute === "/user/dashboard" ? "#4d6029" : "#64748b"}
        />
        <Text
          className={`text-[10px] font-poppins-medium mt-0.5 ${
            activeRoute === "/user/dashboard"
              ? "text-[#4d6029] font-poppins-bold"
              : "text-[#64748b]"
          }`}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* 2. Field Map */}
      <TouchableOpacity
        onPress={() => {
          if (activeRoute !== "/user/map") {
            router.push("/user/map");
          }
        }}
        className="items-center justify-center py-1 px-2 flex-1"
        activeOpacity={0.75}
      >
        <Ionicons
          name={activeRoute === "/user/map" ? "map" : "map-outline"}
          size={22}
          color={activeRoute === "/user/map" ? "#4d6029" : "#64748b"}
        />
        <Text
          className={`text-[10px] font-poppins-medium mt-0.5 ${
            activeRoute === "/user/map"
              ? "text-[#4d6029] font-poppins-bold"
              : "text-[#64748b]"
          }`}
        >
          Map
        </Text>
      </TouchableOpacity>

      {/* 3. Elevated Center Floating Scan Button */}
      <View className="items-center justify-center flex-1 -mt-6">
        <TouchableOpacity
          onPress={() => {
            if (activeRoute !== "/user/scanner") {
              router.push("/user/scanner");
            }
          }}
          className={`w-13 h-13 rounded-full items-center justify-center shadow-lg border-4 border-white active:scale-95 ${
            activeRoute === "/user/scanner"
              ? "bg-[#3a481f] shadow-[#3a481f]/40"
              : "bg-[#4d6029] shadow-[#4d6029]/40"
          }`}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons
            name="qrcode-scan"
            size={22}
            color="#ffffff"
          />
        </TouchableOpacity>
        <Text
          className={`text-[10px] font-poppins-bold mt-1 ${
            activeRoute === "/user/scanner"
              ? "text-[#4d6029]"
              : "text-[#64748b]"
          }`}
        >
          Scan
        </Text>
      </View>

      {/* 4. Distribution Boxes Directory */}
      <TouchableOpacity
        onPress={() => {
          if (activeRoute !== "/user/boxes") {
            router.push("/user/boxes");
          }
        }}
        className="items-center justify-center py-1 px-2 flex-1"
        activeOpacity={0.75}
      >
        <Ionicons
          name={activeRoute === "/user/boxes" ? "albums" : "albums-outline"}
          size={22}
          color={activeRoute === "/user/boxes" ? "#4d6029" : "#64748b"}
        />
        <Text
          className={`text-[10px] font-poppins-medium mt-0.5 ${
            activeRoute === "/user/boxes"
              ? "text-[#4d6029] font-poppins-bold"
              : "text-[#64748b]"
          }`}
        >
          Boxes
        </Text>
      </TouchableOpacity>

      {/* 5. Technician Profile & Utilities (Menu) */}
      <TouchableOpacity
        onPress={() => {
          if (activeRoute !== "/user/profile") {
            router.push("/user/profile");
          }
        }}
        className="items-center justify-center py-1 px-2 flex-1"
        activeOpacity={0.75}
      >
        <Ionicons
          name={activeRoute === "/user/profile" ? "menu" : "menu-outline"}
          size={22}
          color={activeRoute === "/user/profile" ? "#4d6029" : "#64748b"}
        />
        <Text
          className={`text-[10px] font-poppins-medium mt-0.5 ${
            activeRoute === "/user/profile"
              ? "text-[#4d6029] font-poppins-bold"
              : "text-[#64748b]"
          }`}
        >
          menu
        </Text>
      </TouchableOpacity>
    </View>
  );
}
