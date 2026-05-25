import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface Notification {
  id: string;
  message: string;
  type: string;
  createdAt: Timestamp;
}

interface Campaign {
  id: string;
  title: string;
  location: string;
  date: string;
  status: string;
}

export default function HomeScreen() {
  const c = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification))
      );
      setLoadingNotifs(false);
    });

    const cq = query(
      collection(db, "campaigns"),
      orderBy("date", "desc"),
      limit(3)
    );
    const unsub2 = onSnapshot(cq, (snap) => {
      setCampaigns(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign))
      );
    });

    return () => {
      unsub();
      unsub2();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
          />
        }
      >
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greeting, { color: c.mutedForeground }]}>
              {greeting}
            </Text>
            <Text style={[styles.userName, { color: c.foreground }]}>
              {user?.email?.split("@")[0] ?? "Guest"}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: user?.role === "admin" ? c.primary : c.secondary }]}>
            <Text style={[styles.roleText, { color: user?.role === "admin" ? c.primaryForeground : c.secondaryForeground }]}>
              {user?.role ?? "user"}
            </Text>
          </View>
        </View>

        {user?.role === "admin" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              Quick Actions
            </Text>
            <View style={styles.actionGrid}>
              <ActionCard
                icon="image"
                label="Monitor"
                color={c.primary}
                onPress={() => router.push("/(tabs)/monitor")}
                c={c}
              />
              <ActionCard
                icon="users"
                label="Organize"
                color={c.accent}
                onPress={() => router.push("/(tabs)/organize")}
                c={c}
              />
              <ActionCard
                icon="bell"
                label="Notify"
                color={c.warning}
                onPress={() => router.push("/(tabs)/notifications")}
                c={c}
              />
              <ActionCard
                icon="calendar"
                label="Campaigns"
                color={c.info}
                onPress={() => router.push("/(tabs)/campaigns")}
                c={c}
              />
            </View>
          </View>
        )}

        {user?.role === "user" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              Quick Access
            </Text>
            <View style={styles.actionGrid}>
              <ActionCard
                icon="bell"
                label="Notifications"
                color={c.primary}
                onPress={() => router.push("/(tabs)/notifications")}
                c={c}
              />
              <ActionCard
                icon="calendar"
                label="Campaigns"
                color={c.accent}
                onPress={() => router.push("/(tabs)/campaigns")}
                c={c}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              Recent Alerts
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/notifications")}>
              <Text style={[styles.seeAll, { color: c.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {loadingNotifs ? (
            <View style={[styles.placeholder, { backgroundColor: c.card }]} />
          ) : notifications.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="bell-off" size={28} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                No recent alerts
              </Text>
            </View>
          ) : (
            notifications.map((n) => (
              <NotifCard key={n.id} notif={n} c={c} />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              Active Campaigns
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/campaigns")}>
              <Text style={[styles.seeAll, { color: c.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {campaigns.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="calendar" size={28} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                No active campaigns
              </Text>
            </View>
          ) : (
            campaigns.map((camp) => (
              <CampaignCard key={camp.id} campaign={camp} c={c} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionCard({
  icon,
  label,
  color,
  onPress,
  c,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.actionCard, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: c.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function NotifCard({
  notif,
  c,
}: {
  notif: Notification;
  c: ReturnType<typeof useColors>;
}) {
  const typeColor =
    notif.type === "alert"
      ? c.destructive
      : notif.type === "info"
      ? c.info
      : c.primary;

  return (
    <View style={[styles.notifCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.notifDot, { backgroundColor: typeColor }]} />
      <View style={styles.notifContent}>
        <Text style={[styles.notifMessage, { color: c.foreground }]} numberOfLines={2}>
          {notif.message}
        </Text>
        <Text style={[styles.notifTime, { color: c.mutedForeground }]}>
          {notif.createdAt?.toDate?.()?.toLocaleDateString?.() ?? ""}
        </Text>
      </View>
    </View>
  );
}

function CampaignCard({
  campaign,
  c,
}: {
  campaign: Campaign;
  c: ReturnType<typeof useColors>;
}) {
  const statusColor =
    campaign.status === "active"
      ? c.success
      : campaign.status === "upcoming"
      ? c.warning
      : c.mutedForeground;

  return (
    <View style={[styles.campaignCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.campaignHeader}>
        <Text style={[styles.campaignTitle, { color: c.foreground }]} numberOfLines={1}>
          {campaign.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {campaign.status}
          </Text>
        </View>
      </View>
      <View style={styles.campaignMeta}>
        <Feather name="map-pin" size={13} color={c.mutedForeground} />
        <Text style={[styles.metaText, { color: c.mutedForeground }]}>
          {campaign.location}
        </Text>
        <Feather name="calendar" size={13} color={c.mutedForeground} />
        <Text style={[styles.metaText, { color: c.mutedForeground }]}>
          {campaign.date}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 24 },
  greetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "47%",
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  placeholder: {
    height: 72,
    borderRadius: colors.radius,
    opacity: 0.5,
  },
  emptyCard: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  notifCard: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  notifContent: { flex: 1, gap: 4 },
  notifMessage: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  notifTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  campaignCard: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  campaignHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  campaignTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  campaignMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
