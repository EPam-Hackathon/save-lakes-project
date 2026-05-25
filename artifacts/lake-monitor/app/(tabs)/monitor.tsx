import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface MonitorResult {
  id: string;
  imageUrl: string;
  algaeBloom: boolean;
  plasticDebris: boolean;
  confidence: number;
  processedAt: Timestamp;
  status: string;
  location?: string;
}

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function MonitorScreen() {
  const c = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [results, setResults] = useState<MonitorResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<MonitorResult | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "monitor_results"),
      orderBy("processedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MonitorResult)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to upload lake images");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: "image/jpeg",
        name: "lake_image.jpg",
      } as unknown as Blob);

      const response = await fetch(`${API_BASE}/api/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? "Upload failed");
      }

      const data = await response.json();

      await addDoc(collection(db, "monitor_results"), {
        imageUrl: data.image_url,
        algaeBloom: data.algae_bloom,
        plasticDebris: data.plastic_debris,
        confidence: data.confidence,
        status: data.algae_bloom || data.plastic_debris ? "alert" : "clear",
        processedAt: serverTimestamp(),
        uploadedBy: user?.uid,
        location: "Lake Site",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Analysis Complete", formatResult(data));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process image";
      Alert.alert("Error", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploading(false);
    }
  };

  const formatResult = (data: { algae_bloom: boolean; plastic_debris: boolean; confidence: number }) => {
    const detected = [];
    if (data.algae_bloom) detected.push("Algae Bloom");
    if (data.plastic_debris) detected.push("Plastic Debris");
    if (detected.length === 0) return "No contamination detected. Lake looks clean!";
    return `Detected: ${detected.join(", ")}\nConfidence: ${Math.round(data.confidence * 100)}%`;
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
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: insets.bottom + 100,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.foreground }]}>Lake Monitor</Text>
          <TouchableOpacity
            onPress={pickAndUploadImage}
            disabled={uploading}
            activeOpacity={0.82}
            style={[styles.uploadBtn, { backgroundColor: c.primary, opacity: uploading ? 0.6 : 1 }]}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="upload" size={16} color="#fff" />
                <Text style={styles.uploadBtnText}>Upload Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow]}>
          <StatCard
            label="Total Scans"
            value={results.length.toString()}
            icon="image"
            color={c.primary}
            c={c}
          />
          <StatCard
            label="Alerts"
            value={results.filter((r) => r.status === "alert").length.toString()}
            icon="alert-triangle"
            color={c.destructive}
            c={c}
          />
          <StatCard
            label="Clear"
            value={results.filter((r) => r.status === "clear").length.toString()}
            icon="check-circle"
            color={c.success}
            c={c}
          />
        </View>

        {results.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Feather name="camera" size={40} color={c.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>
              No scans yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
              Upload a lake image to begin AI analysis
            </Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              Scan History
            </Text>
            {results.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setSelectedResult(selectedResult?.id === r.id ? null : r)}
                activeOpacity={0.88}
              >
                <ResultCard result={r} c={c} expanded={selectedResult?.id === r.id} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  c,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color: c.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ResultCard({
  result,
  c,
  expanded,
}: {
  result: MonitorResult;
  c: ReturnType<typeof useColors>;
  expanded: boolean;
}) {
  const isAlert = result.status === "alert";
  const statusColor = isAlert ? c.destructive : c.success;

  return (
    <View
      style={[
        styles.resultCard,
        {
          backgroundColor: c.card,
          borderColor: isAlert ? c.destructive + "44" : c.border,
          borderWidth: isAlert ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.resultHeader}>
        {result.imageUrl ? (
          <Image
            source={{ uri: result.imageUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: c.muted }]}>
            <Feather name="image" size={20} color={c.mutedForeground} />
          </View>
        )}
        <View style={styles.resultInfo}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isAlert ? "Alert" : "Clear"}
            </Text>
          </View>
          <Text style={[styles.resultDate, { color: c.mutedForeground }]}>
            {result.processedAt?.toDate?.()?.toLocaleDateString?.() ?? ""}
          </Text>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={c.mutedForeground}
        />
      </View>

      {expanded && (
        <View style={[styles.resultDetails, { borderTopColor: c.border }]}>
          <DetectionRow
            label="Algae Bloom"
            detected={result.algaeBloom}
            c={c}
          />
          <DetectionRow
            label="Plastic Debris"
            detected={result.plasticDebris}
            c={c}
          />
          <View style={styles.confidenceRow}>
            <Text style={[styles.detLabel, { color: c.mutedForeground }]}>
              Confidence
            </Text>
            <View style={[styles.confidenceBar, { backgroundColor: c.muted }]}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    backgroundColor: c.primary,
                    width: `${Math.round((result.confidence ?? 0) * 100)}%` as `${number}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.confValue, { color: c.foreground }]}>
              {Math.round((result.confidence ?? 0) * 100)}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function DetectionRow({
  label,
  detected,
  c,
}: {
  label: string;
  detected: boolean;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.detRow}>
      <Text style={[styles.detLabel, { color: c.mutedForeground }]}>{label}</Text>
      <View
        style={[
          styles.detBadge,
          {
            backgroundColor: detected ? c.destructive + "22" : c.success + "22",
          },
        ]}
      >
        <Feather
          name={detected ? "alert-circle" : "check-circle"}
          size={13}
          color={detected ? c.destructive : c.success}
        />
        <Text
          style={[
            styles.detValue,
            { color: detected ? c.destructive : c.success },
          ]}
        >
          {detected ? "Detected" : "Not Detected"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, gap: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: colors.radius,
  },
  uploadBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyCard: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  resultsList: { gap: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  resultCard: {
    borderRadius: colors.radius,
    overflow: "hidden",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  resultInfo: { flex: 1, gap: 6 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  resultDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resultDetails: {
    borderTopWidth: 1,
    padding: 14,
    gap: 12,
  },
  detRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  detBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  confidenceFill: { height: "100%", borderRadius: 3 },
  confValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 36, textAlign: "right" },
});
