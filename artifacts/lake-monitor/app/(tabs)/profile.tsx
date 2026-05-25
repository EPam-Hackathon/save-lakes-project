import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

export default function ProfileScreen() {
  const c = useColors();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/login");
          } catch {
            Alert.alert("Error", "Failed to sign out");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const menuItems: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    sublabel?: string;
    action?: () => void;
    color?: string;
  }[] = [
    {
      icon: "mail",
      label: "Email",
      sublabel: user?.email ?? "—",
    },
    {
      icon: "phone",
      label: "Contact",
      sublabel: user?.contactNumber ?? "Not set",
    },
    {
      icon: "map-pin",
      label: "Pincode",
      sublabel: user?.pincode ?? "Not set",
    },
    {
      icon: "shield",
      label: "Role",
      sublabel: user?.role === "admin" ? "Administrator" : "User",
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarText}>
              {(user?.email ?? "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.emailText, { color: c.foreground }]}>
            {user?.email ?? ""}
          </Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: user?.role === "admin" ? c.primary : c.secondary },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                {
                  color:
                    user?.role === "admin" ? c.primaryForeground : c.secondaryForeground,
                },
              ]}
            >
              {user?.role === "admin" ? "Administrator" : "User"}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
            ACCOUNT INFO
          </Text>
          {menuItems.map((item, i) => (
            <View key={i}>
              <View style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: c.primary + "18" }]}>
                  <Feather name={item.icon} size={16} color={c.primary} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuLabel, { color: c.mutedForeground }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.menuValue, { color: c.foreground }]}>
                    {item.sublabel}
                  </Text>
                </View>
              </View>
              {i < menuItems.length - 1 && (
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              )}
            </View>
          ))}
        </View>

        {user?.role === "admin" && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
              ADMIN TOOLS
            </Text>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push("/(tabs)/monitor")}
            >
              <View style={[styles.menuIcon, { backgroundColor: c.primary + "18" }]}>
                <Feather name="eye" size={16} color={c.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuValue, { color: c.foreground }]}>Monitor Dashboard</Text>
              </View>
              <Feather name="chevron-right" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push("/(tabs)/organize")}
            >
              <View style={[styles.menuIcon, { backgroundColor: c.primary + "18" }]}>
                <Feather name="users" size={16} color={c.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuValue, { color: c.foreground }]}>Manage Volunteers</Text>
              </View>
              <Feather name="chevron-right" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.82}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: c.destructive + "12",
              borderColor: c.destructive + "40",
              opacity: loggingOut ? 0.6 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={18} color={c.destructive} />
          <Text style={[styles.logoutText, { color: c.destructive }]}>
            {loggingOut ? "Signing out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: c.mutedForeground }]}>
          LakeGuard v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  profileHeader: { alignItems: "center", gap: 10, paddingVertical: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  emailText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 16,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  menuValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginLeft: 50 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: colors.radius,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
});
