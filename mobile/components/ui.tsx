import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "../lib/theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const bg =
    variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : "transparent";
  const fg = variant === "ghost" ? colors.primary : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

// +/- stepper for choosing a quantity.
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={styles.stepper}>
      <Pressable onPress={dec} disabled={value <= min} style={[styles.stepBtn, value <= min && styles.stepDisabled]}>
        <Ionicons name="remove" size={18} color={value <= min ? colors.textMuted : colors.text} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={inc} disabled={value >= max} style={[styles.stepBtn, value >= max && styles.stepDisabled]}>
        <Ionicons name="add" size={18} color={value >= max ? colors.textMuted : colors.text} />
      </Pressable>
    </View>
  );
}

// Small colored count pill — e.g. "4 available".
export function CountPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + "1a" }]}>
      <Text style={[styles.pillText, { color }]}>
        {count} {label}
      </Text>
    </View>
  );
}

// The three stock pills for one equipment row.
export function StockPills({
  available,
  out,
  maintenance,
}: {
  available: number;
  out: number;
  maintenance: number;
}) {
  return (
    <View style={styles.pillRow}>
      <CountPill label="available" count={available} color={colors.statusAvailable} />
      {out > 0 && <CountPill label="out" count={out} color={colors.statusOut} />}
      {maintenance > 0 && (
        <CountPill label="repair" count={maintenance} color={colors.statusMaintenance} />
      )}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={{ color: colors.textMuted, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { fontWeight: "600", fontSize: 15 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
  },
  stepBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  stepDisabled: { opacity: 0.4 },
  stepValue: {
    minWidth: 40,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
});
