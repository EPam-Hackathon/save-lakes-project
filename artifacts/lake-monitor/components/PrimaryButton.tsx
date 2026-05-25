import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "danger";
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: PrimaryButtonProps) {
  const c = useColors();

  const bg =
    variant === "primary"
      ? c.primary
      : variant === "secondary"
      ? c.secondary
      : variant === "danger"
      ? c.destructive
      : "transparent";

  const fg =
    variant === "primary"
      ? c.primaryForeground
      : variant === "secondary"
      ? c.secondaryForeground
      : variant === "danger"
      ? c.destructiveForeground
      : c.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: variant === "outline" ? c.primary : "transparent",
          borderWidth: variant === "outline" ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: colors.radius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
