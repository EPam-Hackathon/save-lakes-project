import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface NotificationItem {
  id: string;
  message: string;
  type: "alert" | "campaign" | "info" | "broadcast";
  title?: string;
  createdAt: Timestamp;
  campaignId?: string;
}

export default function NotificationsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const typeConfig = (type: NotificationItem["type"]) => {
    switch (type) {
      case "alert":
        return { icon: "alert-triangle" as const, color: "#e84040", label: "Alert" };
      case "campaign":
        return { icon: "calendar" as const, color: "#3b82f6", label: "Campaign" };
      case "broadcast":
        return { icon: "radio" as const, color: "#f59e0b", label: "Broadcast" };
      default:
        return { icon: "bell" as const, color: "#1a6b5c", label: "Info" };
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: c.background,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            borderBottomColor: c.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: c.foreground }]}>Notifications</Text>
        <View style={[styles.countBadge, { backgroundColor: c.primary }]}>
          <Text style={styles.countText}>{notifications.length}</Text>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
          />
        }
        scrollEnabled={notifications.length > 0}
        ListEmptyComponent={
          loading ? null : (
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="bell-off" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>
                No notifications yet
              </Text>
              <Text style={[styles.emptyBody, { color: c.mutedForeground }]}>
                Campaign invites and alerts will appear here
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const cfg = typeConfig(item.type);
          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: cfg.color + "20" }]}>
                <Feather name={cfg.icon} size={22} color={cfg.color} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.color + "20" }]}>
                    <Text style={[styles.typeText, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                  <Text style={[styles.time, { color: c.mutedForeground }]}>
                    {item.createdAt?.toDate?.()?.toLocaleDateString?.() ?? ""}
                  </Text>
                </View>
                {item.title ? (
                  <Text style={[styles.notifTitle, { color: c.foreground }]}>
                    {item.title}
                  </Text>
                ) : null}
                <Text style={[styles.message, { color: c.foreground }]} numberOfLines={3}>
                  {item.message}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  emptyCard: {
    marginTop: 60,
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 6 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  message: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
