import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { authService } from "@/services/auth";
import { AuthUser, useAuth } from "@/services/auth-state";

export interface SidebarBadgeCounts {
  boxes?: number | string;
  newQr?: number | string;
  technicians?: number | string;
  logs?: number | string;
  [key: string]: number | string | undefined;
}

export interface SidebarNavigationProps {
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  locationLabel?: string;
  badgeCounts?: SidebarBadgeCounts;
  user?: AuthUser | null;
}

interface MenuItem {
  title: string;
  route: string;
  icon: string;
  iconType: "ionicons" | "material";
  badge?: string;
  badgeType?: "default" | "amber" | "green";
}

/**
 * Helper to compute user initials (e.g., "AD", "SA")
 */
function getUserInitials(user: AuthUser | null): string {
  if (!user) return "AD";

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  if (first) {
    return first.slice(0, 2).toUpperCase();
  }
  if (user.name?.trim()) {
    const parts = user.name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name.trim().slice(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return "AD";
}

/**
 * Helper to get clean display name
 */
function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "Administrator";

  const first = user.firstName?.trim();
  const last = user.lastName?.trim();

  if (first && last) {
    return `${first} ${last}`;
  }
  if (first) return first;
  if (user.name?.trim()) return user.name.trim();
  if (user.email) return user.email.split("@")[0];
  return "Administrator";
}

/**
 * Helper to get formatted user role
 */
function getUserDisplayRole(user: AuthUser | null): string {
  if (!user?.role) return "System Admin";

  const roleLower = user.role.toLowerCase();
  if (roleLower === "admin") return "System Admin";
  if (roleLower === "technician" || roleLower === "user") return "Field Technician";
  return user.role.charAt(0).toUpperCase() + user.role.slice(1);
}

export function SidebarNavigation({
  activeRoute: explicitActiveRoute,
  onNavigate,
  collapsed: externalCollapsed,
  onToggleCollapse,
  className = "",
  locationLabel = "Admin Portal · Iligan",
  badgeCounts,
  user: propUser,
}: SidebarNavigationProps) {
  // Reactive Auth state
  const { user: contextUser } = useAuth();
  const currentUser = propUser !== undefined ? propUser : contextUser;

  // Active route: falls back to current router pathname if activeRoute is omitted
  const currentPath = usePathname();
  const activeRoute = explicitActiveRoute || currentPath || "/admin/dashboard";

  // Support both controlled and internal state for collapse
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed =
    externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Dynamic box counts calculation - strictly from passed dynamic props
  const totalBoxesCount =
    badgeCounts?.boxes !== undefined ? String(badgeCounts.boxes) : undefined;

  const needsTagCount =
    badgeCounts?.newQr !== undefined ? String(badgeCounts.newQr) : undefined;

  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      route: "/admin/dashboard",
      icon: "grid-outline",
      iconType: "ionicons",
    },
    {
      title: "Distribution Boxes",
      route: "/admin/box-management",
      icon: "server-network",
      iconType: "material",
      badge: totalBoxesCount,
      badgeType: "default",
    },
    {
      title: "Print QR",
      route: "/admin/qr-print",
      icon: "printer",
      iconType: "material",
      badge: needsTagCount,
      badgeType: "amber",
    },
    {
      title: "Technicians",
      route: "/admin/technicians",
      icon: "people-outline",
      iconType: "ionicons",
      badge: badgeCounts?.technicians ? String(badgeCounts.technicians) : undefined,
      badgeType: "default",
    },
    {
      title: "Activity Logs",
      route: "/admin/activity-logs",
      icon: "shield-checkmark-outline",
      iconType: "ionicons",
      badge: badgeCounts?.logs ? String(badgeCounts.logs) : undefined,
      badgeType: "default",
    },
    {
      title: "Settings",
      route: "/admin/settings",
      icon: "settings-outline",
      iconType: "ionicons",
    },
  ];

  const handleItemPress = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      router.push(route as any);
    }
  };

  const handleSignOut = () => {
    authService.logout();
    router.replace("/auth/sign-in");
  };

  const initials = getUserInitials(currentUser);
  const displayName = getUserDisplayName(currentUser);
  const displayRole = getUserDisplayRole(currentUser);

  return (
    <View
      className={`bg-white border-r border-slate-200/80 h-full flex-col justify-between transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72"
      } ${className}`}
    >
      <View className="flex-1">
        {/* Top Header: Hamburger Button & MultiFactors Logo */}
        <View
          className={`px-4 py-5 border-b border-slate-100 flex-row items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {/* Olive Green Hamburger Menu Button */}
          <TouchableOpacity
            onPress={handleToggle}
            activeOpacity={0.8}
            className="w-11 h-11 rounded-2xl bg-[#4d6029] items-center justify-center shadow-sm"
            accessibilityLabel="Toggle Sidebar"
          >
            <Ionicons name="menu-outline" size={24} color="#ffffff" />
          </TouchableOpacity>

          {/* Logo & Portal Subtitle (Expanded Mode) */}
          {!isCollapsed && (
            <View className="flex-1 ml-3.5">
              <Image
                source={require("@/assets/images/logo-final.jpg")}
                style={{ width: 145, height: 32 }}
                resizeMode="contain"
              />
              <View className="flex-row items-center mt-1">
                <View className="w-2 h-2 rounded-full bg-[#4d6029] mr-1.5" />
                <Text className="text-[11px] font-poppins-medium text-[#4d6029]">
                  {locationLabel}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Section Title */}
        {!isCollapsed && (
          <View className="px-5 pt-6 pb-2">
            <Text className="text-[11px] font-poppins-semibold text-[#8a99ad] uppercase tracking-wider">
              MAIN NAVIGATION
            </Text>
          </View>
        )}

        {/* Navigation Items List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          className={`py-2 ${isCollapsed ? "px-2.5" : "px-4"}`}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {menuItems.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <TouchableOpacity
                key={item.route}
                onPress={() => handleItemPress(item.route)}
                activeOpacity={0.8}
                className={`flex-row items-center rounded-2xl mb-2 transition-all relative ${
                  isCollapsed ? "p-3 justify-center" : "px-4 py-3.5"
                } ${
                  isActive
                    ? "bg-[#4d6029] shadow-sm shadow-[#4d6029]/30"
                    : "bg-transparent hover:bg-slate-50"
                }`}
              >
                {/* Menu Icon */}
                <View className="relative">
                  {item.iconType === "material" ? (
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={21}
                      color={isActive ? "#ffffff" : "#64748b"}
                    />
                  ) : (
                    <Ionicons
                      name={item.icon as any}
                      size={21}
                      color={isActive ? "#ffffff" : "#64748b"}
                    />
                  )}
                  {/* Collapsed notification dot */}
                  {isCollapsed && item.badge && (
                    <View
                      className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${
                        item.badgeType === "amber"
                          ? "bg-amber-500"
                          : "bg-[#4d6029]"
                      }`}
                    />
                  )}
                </View>

                {/* Menu Title & Badge (Expanded Mode) */}
                {!isCollapsed && (
                  <View className="flex-1 flex-row items-center justify-between ml-3">
                    <Text
                      numberOfLines={1}
                      className={`text-sm ${
                        isActive
                          ? "text-white font-poppins-bold"
                          : "text-[#1e293b] font-poppins-medium"
                      }`}
                    >
                      {item.title}
                    </Text>

                    {item.badge && (
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20"
                            : item.badgeType === "amber"
                              ? "bg-amber-100"
                              : "bg-slate-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-poppins-bold ${
                            isActive
                              ? "text-white"
                              : item.badgeType === "amber"
                                ? "text-amber-800"
                                : "text-slate-600"
                          }`}
                        >
                          {item.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Footer / User Profile Card */}
      <View className="p-3.5 border-t border-slate-100">
        {isCollapsed ? (
          /* Collapsed User Avatar */
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.7}
            accessibilityLabel="Sign Out"
            className="w-12 h-12 rounded-2xl bg-[#e2e9d8] border border-[#4d6029]/20 items-center justify-center self-center"
          >
            <Text className="text-xs font-poppins-bold text-[#4d6029]">
              {initials}
            </Text>
          </TouchableOpacity>
        ) : (
          /* Expanded User Card matching exact mockup */
          <View className="bg-[#f0f4f8] rounded-2xl p-3 border border-slate-200/60 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-xl bg-[#e2e9d8] border border-[#4d6029]/20 items-center justify-center mr-3">
                <Text className="text-xs font-poppins-bold text-[#4d6029]">
                  {initials}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-poppins-bold text-[#0f172a]"
                >
                  {displayName}
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-xs font-poppins text-[#8a99ad]"
                >
                  {displayRole}
                </Text>
              </View>
            </View>

            {/* Logout Icon */}
            <TouchableOpacity
              onPress={handleSignOut}
              accessibilityLabel="Sign Out"
              activeOpacity={0.7}
              className="p-2 rounded-xl hover:bg-slate-200/60"
            >
              <Ionicons name="log-out-outline" size={20} color="#8a99ad" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default SidebarNavigation;
