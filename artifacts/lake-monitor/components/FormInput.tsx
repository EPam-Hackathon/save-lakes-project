import React from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
}

export function FormInput({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: FormInputProps) {
  const c = useColors();
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: c.foreground }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: c.card,
            borderColor: error ? c.destructive : c.border,
          },
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={18}
            color={c.mutedForeground}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          style={[styles.input, { color: c.foreground }, style]}
          placeholderTextColor={c.mutedForeground}
          {...props}
        />
        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Feather name={rightIcon} size={18} color={c.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: colors.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 10, padding: 2 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  error: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
