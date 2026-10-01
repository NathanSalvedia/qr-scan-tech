import { UserBottomNavigation } from "@/components/user-bottom-navigation";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-2xl font-poppins-bold text-[#0f172a] text-center">
          Menus
        </Text>
      </View>
      <UserBottomNavigation activeRoute="/user/profile" />
    </SafeAreaView>
  );
}
