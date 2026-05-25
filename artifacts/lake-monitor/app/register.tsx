import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth, UserRole } from "@/context/AuthContext";
import { FormInput } from "@/components/FormInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";

export default function RegisterScreen() {
  const c = useColors();
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [pincode, setPincode] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Minimum 6 characters";
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!contactNumber.trim()) e.contactNumber = "Contact number is required";
    if (!pincode.trim()) e.pincode = "Pincode is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp({ email: email.trim(), password, contactNumber, pincode, role });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("email-already-in-use")
            ? "Email is already registered"
            : err.message
          : "Registration failed";
      Alert.alert("Registration Failed", msg);
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
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 24,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={c.foreground} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: c.foreground }]}>
            Create Account
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.form}>
            <FormInput
              label="Email Address"
              icon="mail"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <FormInput
              label="Contact Number"
              icon="phone"
              placeholder="+1 234 567 8900"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
              error={errors.contactNumber}
            />
            <FormInput
              label="Pincode"
              icon="map-pin"
              placeholder="Enter your area pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              error={errors.pincode}
            />
            <FormInput
              label="Password"
              icon="lock"
              placeholder="Minimum 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off" : "eye"}
              onRightIconPress={() => setShowPassword((v) => !v)}
              error={errors.password}
            />
            <FormInput
              label="Confirm Password"
              icon="lock"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />

            <View style={styles.roleSection}>
              <Text style={[styles.roleLabel, { color: c.foreground }]}>Register as</Text>
              <View style={styles.roleRow}>
                {(["user", "admin"] as UserRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor:
                          role === r ? c.primary : c.secondary,
                        borderColor: role === r ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        {
                          color: role === r ? c.primaryForeground : c.foreground,
                        },
                      ]}
                    >
                      {r === "admin" ? "Admin" : "User"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <PrimaryButton
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
          />

          <Text style={[styles.loginLink, { color: c.mutedForeground }]}>
            Already have an account?{" "}
            <Text
              style={[styles.link, { color: c.primary }]}
              onPress={() => router.replace("/login")}
            >
              Sign in
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 20 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { padding: 6 },
  screenTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 24,
    gap: 20,
  },
  form: { gap: 14 },
  roleSection: { gap: 8 },
  roleLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  roleRow: { flexDirection: "row", gap: 10 },
  roleChip: {
    flex: 1,
    height: 44,
    borderRadius: colors.radius,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  roleChipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  loginLink: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  link: { fontFamily: "Inter_600SemiBold" },
});
