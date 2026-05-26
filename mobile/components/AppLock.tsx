import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  authenticateBiometric,
  biometricAvailable,
  hasPin,
  isLockEnabled,
  verifyPin,
} from "../lib/security";
import { colors } from "../lib/theme";

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pinSet, setPinSet] = useState(false);

  useEffect(() => {
    (async () => {
      const enabled = await isLockEnabled();
      if (!enabled) {
        setLocked(false);
        setChecking(false);
        return;
      }
      setLocked(true);
      setPinSet(await hasPin());
      setChecking(false);
      // Try biometric immediately.
      if (await biometricAvailable()) {
        const ok = await authenticateBiometric();
        if (ok) setLocked(false);
      }
    })();
  }, []);

  async function tryBiometric() {
    if (await biometricAvailable()) {
      const ok = await authenticateBiometric();
      if (ok) setLocked(false);
      else setError("Biometric check failed. Try your PIN.");
    } else {
      setError("Biometric unlock is not set up on this device.");
    }
  }

  async function submitPin(digits: string) {
    if (await verifyPin(digits)) {
      setLocked(false);
      setError("");
    } else {
      setError("Incorrect PIN.");
      setPin("");
    }
  }

  function pressKey(k: string) {
    setError("");
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + k).slice(0, 6);
    setPin(next);
    if (next.length >= 4 && next.length === 4) {
      // 4-digit PIN: auto-submit at 4.
      submitPin(next);
    }
  }

  if (checking) return <View style={styles.bg} />;
  if (!locked) return <>{children}</>;

  return (
    <View style={styles.bg}>
      <View style={styles.lockIcon}>
        <Ionicons name="lock-closed" size={36} color="#fff" />
      </View>
      <Text style={styles.title}>Equipment Tracker</Text>
      <Text style={styles.subtitle}>Enter your PIN to unlock</Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length && styles.dotFilled,
              i >= 4 && pin.length < 5 && { opacity: 0.25 },
            ]}
          />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : <View style={{ height: 18 }} />}

      {pinSet && (
        <View style={styles.pad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
            <Pressable key={k} style={styles.key} onPress={() => pressKey(k)}>
              <Text style={styles.keyText}>{k}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.key} onPress={tryBiometric}>
            <Ionicons name="finger-print" size={26} color="#fff" />
          </Pressable>
          <Pressable style={styles.key} onPress={() => pressKey("0")}>
            <Text style={styles.keyText}>0</Text>
          </Pressable>
          <Pressable
            style={styles.key}
            onPress={() => (pin.length === 6 || pin.length === 5 ? submitPin(pin) : pressKey("del"))}
          >
            <Ionicons
              name={pin.length >= 5 ? "checkmark" : "backspace-outline"}
              size={24}
              color="#fff"
            />
          </Pressable>
        </View>
      )}

      {!pinSet && (
        <Pressable style={styles.bioBtn} onPress={tryBiometric}>
          <Ionicons name="finger-print" size={22} color="#fff" />
          <Text style={styles.bioBtnText}>Unlock with biometrics</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.sidebar,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  dots: { flexDirection: "row", gap: 14, marginTop: 28 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#475569",
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { color: "#f87171", marginTop: 14, fontSize: 13, fontWeight: "600", height: 18 },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 264,
    justifyContent: "center",
    gap: 14,
    marginTop: 18,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { color: "#fff", fontSize: 26, fontWeight: "600" },
  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  bioBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
