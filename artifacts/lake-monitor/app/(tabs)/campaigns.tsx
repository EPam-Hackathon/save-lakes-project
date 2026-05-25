import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface Campaign {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  status: "active" | "upcoming" | "completed";
  organizer?: string;
  createdAt?: Timestamp;
  rsvpCount?: number;
}

interface RsvpStatus {
  [campaignId: string]: "accepted" | "declined" | null;
}

export default function CampaignsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>({});
  const [rsvping, setRsvping] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "campaigns"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const camps = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
      setCampaigns(camps);

      if (user?.uid) {
        const statusMap: RsvpStatus = {};
        await Promise.all(
          camps.map(async (camp) => {
            const rsvpRef = doc(db, "rsvp", `${camp.id}_${user.uid}`);
            const rsvpDoc = await getDoc(rsvpRef);
            if (rsvpDoc.exists()) {
              statusMap[camp.id] = rsvpDoc.data().status;
            } else {
              statusMap[camp.id] = null;
            }
          })
        );
        setRsvpStatus(statusMap);
      }
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const handleRsvp = async (campaignId: string, status: "accepted" | "declined") => {
    if (!user?.email) return;
    setRsvping(campaignId);
    try {
      const rsvpRef = doc(db, "rsvp", `${campaignId}_${user.uid}`);
      await setDoc(rsvpRef, {
        campaignId,
        userEmail: user.email,
        userId: user.uid,
        status,
        updatedAt: serverTimestamp(),
      });
      setRsvpStatus((prev) => ({ ...prev, [campaignId]: status }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        status === "accepted" ? "RSVP Confirmed!" : "RSVP Updated",
        status === "accepted"
          ? "You're registered for this campaign"
          : "You've declined this campaign"
      );
    } catch {
      Alert.alert("Error", "Failed to update RSVP");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRsvping(null);
    }
  };

  const statusConfig = (status: Campaign["status"]) => {
    switch (status) {
      case "active":
        return { color: "#22c55e", label: "Active" };
      case "upcoming":
        return { color: "#f59e0b", label: "Upcoming" };
      case "completed":
        return { color: "#6b7c8d", label: "Completed" };
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

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
        <Text style={[styles.title, { color: c.foreground }]}>Campaigns</Text>
        <View style={[styles.totalBadge, { backgroundColor: c.primary + "22" }]}>
          <Text style={[styles.totalText, { color: c.primary }]}>
            {campaigns.filter((c) => c.status !== "completed").length} active
          </Text>
        </View>
      </View>

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!campaigns.length}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Feather name="calendar" size={40} color={c.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>
              No campaigns yet
            </Text>
            <Text style={[styles.emptyBody, { color: c.mutedForeground }]}>
              Environmental cleanup campaigns will appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = statusConfig(item.status);
          const myRsvp = rsvpStatus[item.id];
          const isRsvping = rsvping === item.id;
          const isCompleted = item.status === "completed";

          return (
            <View
              style={[
                styles.card,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: cfg.color + "20" }]}>
                  <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </View>
                {myRsvp === "accepted" && (
                  <View style={[styles.myRsvpBadge, { backgroundColor: c.primary + "20" }]}>
                    <Feather name="check" size={12} color={c.primary} />
                    <Text style={[styles.myRsvpText, { color: c.primary }]}>
                      Going
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.cardTitle, { color: c.foreground }]}>
                {item.title}
              </Text>
              <Text
                style={[styles.cardDesc, { color: c.mutedForeground }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={13} color={c.mutedForeground} />
                  <Text style={[styles.metaText, { color: c.mutedForeground }]}>
                    {item.location}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="calendar" size={13} color={c.mutedForeground} />
                  <Text style={[styles.metaText, { color: c.mutedForeground }]}>
                    {item.date}
                  </Text>
                </View>
              </View>

              {!isCompleted && (
                <View style={styles.rsvpRow}>
                  <TouchableOpacity
                    onPress={() => handleRsvp(item.id, "accepted")}
                    disabled={isRsvping || myRsvp === "accepted"}
                    activeOpacity={0.82}
                    style={[
                      styles.rsvpBtn,
                      {
                        backgroundColor:
                          myRsvp === "accepted" ? c.primary : c.primary + "15",
                        opacity: isRsvping ? 0.6 : 1,
                      },
                    ]}
                  >
                    {isRsvping ? (
                      <ActivityIndicator size="small" color={myRsvp === "accepted" ? "#fff" : c.primary} />
                    ) : (
                      <>
                        <Feather
                          name="check"
                          size={14}
                          color={myRsvp === "accepted" ? "#fff" : c.primary}
                        />
                        <Text
                          style={[
                            styles.rsvpText,
                            {
                              color: myRsvp === "accepted" ? "#fff" : c.primary,
                            },
                          ]}
                        >
                          {myRsvp === "accepted" ? "Attending" : "Accept"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRsvp(item.id, "declined")}
                    disabled={isRsvping || myRsvp === "declined"}
                    activeOpacity={0.82}
                    style={[
                      styles.rsvpBtn,
                      {
                        backgroundColor:
                          myRsvp === "declined"
                            ? c.destructive
                            : c.destructive + "15",
                        opacity: isRsvping ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name="x"
                      size={14}
                      color={myRsvp === "declined" ? "#fff" : c.destructive}
                    />
                    <Text
                      style={[
                        styles.rsvpText,
                        {
                          color: myRsvp === "declined" ? "#fff" : c.destructive,
                        },
                      ]}
                    >
                      {myRsvp === "declined" ? "Declined" : "Decline"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  totalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  totalText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  emptyCard: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 48,
    alignItems: "center",
    gap: 12,
    marginTop: 40,
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
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  myRsvpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  myRsvpText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  metaRow: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  rsvpRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  rsvpBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rsvpText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
