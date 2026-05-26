import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card } from "../../components/ui";
import { getCheckoutLines, listAllCheckouts } from "../../lib/crud";
import { sendWhatsAppReminder } from "../../lib/reminders";
import { colors } from "../../lib/theme";
import type { Checkout, CheckoutLine } from "../../lib/types";

function fmt(ts?: string | null) {
  if (!ts) return "";
  return ts.replace("T", " ").slice(0, 16);
}

export default function TransactionsScreen() {
  const [items, setItems] = useState<Checkout[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, CheckoutLine[]>>({});

  useFocusEffect(
    useCallback(() => {
      listAllCheckouts().then(setItems);
    }, [])
  );

  async function toggle(id: number) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    if (!lines[id]) {
      const ls = await getCheckoutLines(id);
      setLines((p) => ({ ...p, [id]: ls }));
    }
    setExpanded(id);
  }

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (c: Checkout) => (c.open_units ?? 0) > 0 && c.due_date < today;
  const isReturned = (c: Checkout) => (c.open_units ?? 0) === 0;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Button title="Check Out" onPress={() => router.push("/checkout")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Check In" variant="ghost" onPress={() => router.push("/checkin")} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No activity yet.
          </Text>
        }
        renderItem={({ item }) => {
          const overdue = isOverdue(item);
          const returned = isReturned(item);
          return (
            <Card>
              <Pressable onPress={() => toggle(item.id)}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.client_name}</Text>
                  <Text
                    style={[
                      styles.tag,
                      returned ? styles.tagReturned : overdue ? styles.tagOverdue : styles.tagOut,
                    ]}
                  >
                    {returned ? "Returned" : overdue ? "Overdue" : "Out"}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {item.total_units} unit(s) · {item.line_count} item(s) · out {fmt(item.out_timestamp)}
                </Text>
                <Text style={styles.meta}>
                  Due {item.due_date}
                  {!returned ? ` · ${item.open_units} still out` : ""}
                </Text>
                {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              </Pressable>

              {expanded === item.id && lines[item.id] && (
                <View style={styles.lineBox}>
                  {lines[item.id].map((l) => (
                    <View key={l.id} style={styles.lineRow}>
                      <Text style={styles.lineName}>{l.equipment_name}</Text>
                      <Text style={styles.lineQty}>
                        {l.quantity} out
                        {l.returned_good > 0 ? ` · ${l.returned_good} good` : ""}
                        {l.returned_damaged > 0 ? ` · ${l.returned_damaged} damaged` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {overdue && (
                <Pressable
                  style={styles.waBtn}
                  onPress={() => sendWhatsAppReminder(item, item.client_phone ?? null)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <Text style={styles.waBtnText}>Send WhatsApp reminder</Text>
                </Pressable>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  notes: { fontSize: 12, color: colors.text, marginTop: 4, fontStyle: "italic" },
  tag: { fontSize: 11, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  tagOut: { backgroundColor: "#fef3c7", color: "#b45309" },
  tagOverdue: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  tagReturned: { backgroundColor: "#dcfce7", color: "#15803d" },
  lineBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  lineRow: { flexDirection: "row", justifyContent: "space-between" },
  lineName: { fontSize: 13, fontWeight: "600", color: colors.text },
  lineQty: { fontSize: 12, color: colors.textMuted },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  waBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
