import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
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

interface Volunteer {
  id: string;
  email: string;
  contactNumber: string;
  pincode: string;
  role: string;
  createdAt: Timestamp;
}

export default function OrganizeScreen() {
  const c = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [filterPincode, setFilterPincode] = useState("");

  useEffect(() => {
    let q = query(collection(db, "users"), where("role", "==", "user"));

    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Volunteer)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredVolunteers = filterPincode.trim()
    ? volunteers.filter((v) => v.pincode?.includes(filterPincode.trim()))
    : volunteers;

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) {
      Alert.alert("Missing fields", "Please fill in both title and message");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "notifications"), {
        title: broadcastTitle.trim(),
        message: broadcastMsg.trim(),
        type: "broadcast",
        sentBy: user?.uid,
        createdAt: serverTimestamp(),
        targetPincode: filterPincode || "all",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Broadcast Sent", `Message sent to ${filteredVolunteers.length} volunteers`);
      setBroadcastMsg("");
      setBroadcastTitle("");
      setShowBroadcast(false);
    } catch {
      Alert.alert("Error", "Failed to send broadcast");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
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
        <Text style={[styles.title, { color: c.foreground }]}>Organize Drive</Text>
        <TouchableOpacity
          onPress={() => setShowBroadcast(true)}
          style={[styles.broadcastBtn, { backgroundColor: c.primary }]}
        >
          <Feather name="radio" size={16} color="#fff" />
          <Text style={styles.broadcastBtnText}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.filterRow,
          { paddingHorizontal: 16, paddingVertical: 12 },
        ]}
      >
        <View
          style={[
            styles.filterInput,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <Feather name="map-pin" size={16} color={c.mutedForeground} />
          <TextInput
            placeholder="Filter by pincode..."
            placeholderTextColor={c.mutedForeground}
            value={filterPincode}
            onChangeText={setFilterPincode}
            style={[styles.filterText, { color: c.foreground }]}
          />
          {filterPincode.length > 0 && (
            <TouchableOpacity onPress={() => setFilterPincode("")}>
              <Feather name="x" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.countPill, { backgroundColor: c.secondary }]}>
          <Text style={[styles.countPillText, { color: c.secondaryForeground }]}>
            {filteredVolunteers.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredVolunteers}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!filteredVolunteers.length}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          },
        ]}
        ListEmptyComponent={
          loading ? null : (
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="users" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>
                {filterPincode ? "No volunteers in this area" : "No volunteers yet"}
              </Text>
              <Text style={[styles.emptyBody, { color: c.mutedForeground }]}>
                Registered users will appear here
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={[styles.volunteerCard, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <View style={[styles.avatar, { backgroundColor: c.primary + "22" }]}>
              <Text style={[styles.avatarText, { color: c.primary }]}>
                {item.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.volunteerInfo}>
              <Text style={[styles.volunteerEmail, { color: c.foreground }]} numberOfLines={1}>
                {item.email}
              </Text>
              <View style={styles.volunteerMeta}>
                <Feather name="phone" size={12} color={c.mutedForeground} />
                <Text style={[styles.metaText, { color: c.mutedForeground }]}>
                  {item.contactNumber || "—"}
                </Text>
                <Feather name="map-pin" size={12} color={c.mutedForeground} />
                <Text style={[styles.metaText, { color: c.mutedForeground }]}>
                  {item.pincode || "—"}
                </Text>
              </View>
            </View>
            <View style={[styles.subscribedBadge, { backgroundColor: c.success + "20" }]}>
              <Text style={[styles.subscribedText, { color: c.success }]}>Subscribed</Text>
            </View>
          </View>
        )}
      />

      <Modal visible={showBroadcast} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalWrapper}
          >
            <View style={[styles.modalContent, { backgroundColor: c.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>
                  Broadcast Message
                </Text>
                <TouchableOpacity onPress={() => setShowBroadcast(false)}>
                  <Feather name="x" size={22} color={c.mutedForeground} />
                </TouchableOpacity>
              </View>

              {filterPincode ? (
                <View style={[styles.targetInfo, { backgroundColor: c.primary + "15" }]}>
                  <Feather name="map-pin" size={14} color={c.primary} />
                  <Text style={[styles.targetText, { color: c.primary }]}>
                    Sending to {filteredVolunteers.length} volunteers in pincode {filterPincode}
                  </Text>
                </View>
              ) : (
                <View style={[styles.targetInfo, { backgroundColor: c.primary + "15" }]}>
                  <Feather name="users" size={14} color={c.primary} />
                  <Text style={[styles.targetText, { color: c.primary }]}>
                    Sending to all {volunteers.length} volunteers
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.foreground }]}>Title</Text>
                <TextInput
                  value={broadcastTitle}
                  onChangeText={setBroadcastTitle}
                  placeholder="Campaign title or subject"
                  placeholderTextColor={c.mutedForeground}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: c.background,
                      borderColor: c.border,
                      color: c.foreground,
                    },
                  ]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.foreground }]}>Message</Text>
                <TextInput
                  value={broadcastMsg}
                  onChangeText={setBroadcastMsg}
                  placeholder="Write your message..."
                  placeholderTextColor={c.mutedForeground}
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: c.background,
                      borderColor: c.border,
                      color: c.foreground,
                    },
                  ]}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowBroadcast(false)}
                  style={[styles.cancelBtn, { borderColor: c.border }]}
                >
                  <Text style={[styles.cancelText, { color: c.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={sendBroadcast}
                  disabled={sending}
                  activeOpacity={0.82}
                  style={[
                    styles.sendBtn,
                    { backgroundColor: c.primary, opacity: sending ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="send" size={15} color="#fff" />
                  <Text style={styles.sendBtnText}>
                    {sending ? "Sending..." : "Send Broadcast"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  broadcastBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: colors.radius,
  },
  broadcastBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: colors.radius,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  countPill: {
    width: 44,
    height: 44,
    borderRadius: colors.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  emptyCard: {
    marginTop: 40,
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  volunteerCard: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  volunteerInfo: { flex: 1, gap: 4 },
  volunteerEmail: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  volunteerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subscribedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  subscribedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalWrapper: { justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  targetInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  targetText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textInput: {
    borderRadius: colors.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    borderRadius: colors.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: colors.radius,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sendBtn: {
    flex: 2,
    height: 48,
    borderRadius: colors.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
