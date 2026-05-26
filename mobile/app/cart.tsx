import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Empty, Field, Stepper } from "../components/ui";
import { useCart } from "../lib/CartContext";
import { checkoutCart, listClients } from "../lib/crud";
import { colors } from "../lib/theme";
import type { Client } from "../lib/types";

function defaultDue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function Cart() {
  const cart = useCart();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | null>(null);
  const [due, setDue] = useState(defaultDue());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listClients().then(setClients);
  }, []);

  async function submit() {
    if (!clientId) {
      Alert.alert("Select a client", "Choose who is borrowing this equipment.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      Alert.alert("Invalid date", "Use format YYYY-MM-DD.");
      return;
    }
    setSubmitting(true);
    try {
      await checkoutCart(clientId, due, notes, cart.items);
      cart.clear();
      Alert.alert("Checked out", "Equipment has been checked out.", [
        { text: "OK", onPress: () => router.dismissAll() },
      ]);
    } catch (e: any) {
      Alert.alert("Checkout failed", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.count === 0) {
    return (
      <View style={{ flex: 1 }}>
        <Empty text="Your cart is empty. Go back and add equipment." />
        <View style={{ padding: 20 }}>
          <Button title="Back to equipment" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.section}>Items to check out</Text>
      {cart.items.map((item) => (
        <View key={item.equipment.id} style={styles.lineCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lineName}>{item.equipment.name}</Text>
            <Text style={styles.lineSub}>
              {item.equipment.category} · {item.equipment.available} available
            </Text>
          </View>
          <Stepper
            value={item.quantity}
            min={1}
            max={item.equipment.available ?? 1}
            onChange={(n) => cart.setQuantity(item.equipment.id, n)}
          />
          <Pressable onPress={() => cart.remove(item.equipment.id)} style={styles.removeBtn}>
            <Ionicons name="close" size={18} color={colors.danger} />
          </Pressable>
        </View>
      ))}
      <Text style={styles.totalLine}>
        Total: {cart.totalUnits} unit{cart.totalUnits > 1 ? "s" : ""} across {cart.count} item
        {cart.count > 1 ? "s" : ""}
      </Text>

      <Text style={[styles.section, { marginTop: 22 }]}>Client / Borrower</Text>
      {clients.length === 0 ? (
        <Text style={styles.empty}>No clients yet. Add one in the Clients tab.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {clients.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setClientId(c.id)}
              style={[styles.clientOpt, clientId === c.id && styles.clientOptActive]}
            >
              <Ionicons
                name={clientId === c.id ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={clientId === c.id ? "#fff" : colors.textMuted}
              />
              <View>
                <Text style={[styles.clientName, clientId === c.id && { color: "#fff" }]}>
                  {c.name}
                </Text>
                {c.phone ? (
                  <Text style={[styles.clientPhone, clientId === c.id && { color: "#e0e7ff" }]}>
                    {c.phone}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ height: 20 }} />
      <Field
        label="Due Date (YYYY-MM-DD)"
        value={due}
        onChangeText={setDue}
        placeholder="2026-05-22"
        autoCapitalize="none"
      />
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Event name, remarks" />

      <Button
        title={submitting ? "Processing…" : "Confirm Checkout"}
        onPress={submit}
        disabled={submitting || !clientId}
      />
      <View style={{ height: 10 }} />
      <Button title="Keep shopping" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 12 },
  empty: { color: colors.textMuted },
  lineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  lineName: { fontSize: 15, fontWeight: "700", color: colors.text },
  lineSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  removeBtn: { padding: 4 },
  totalLine: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 6 },
  clientOpt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  clientOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  clientName: { fontSize: 15, fontWeight: "600", color: colors.text },
  clientPhone: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
