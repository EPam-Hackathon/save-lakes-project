import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { FormInput } from "@/components/FormInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";

export default function LoginScreen() {
  const c = useColors();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("invalid-credential")
            ? "Invalid email or password"
            : err.message
          : "Login failed";
      Alert.alert("Login Failed", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 32,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: c.primary }]}>
            <Feather name="droplet" size={36} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: c.primary }]}>LakeGuard</Text>
          <Text style={[styles.tagline, { color: c.mutedForeground }]}>
            Lake Monitoring System
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.foreground }]}>Sign in</Text>

          <View style={styles.form}>
            <FormInput
              label="Email"
              icon="mail"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <FormInput
              label="Password"
              icon="lock"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off" : "eye"}
              onRightIconPress={() => setShowPassword((v) => !v)}
              error={errors.password}
            />
          </View>

          <PrimaryButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.mutedForeground }]}>or</Text>
            <View style={[styles.line, { backgroundColor: c.border }]} />
          </View>

          <Text style={[styles.noAccountText, { color: c.mutedForeground }]}>
            Don't have an account?{" "}
            <Text
              style={[styles.linkText, { color: c.primary }]}
              onPress={() => router.push("/register")}
            >
              Register here
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 28 },
  header: { alignItems: "center", gap: 12 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  form: { gap: 16 },
  loginBtn: { marginTop: 4 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  line: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  noAccountText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  linkText: { fontFamily: "Inter_600SemiBold" },
});
