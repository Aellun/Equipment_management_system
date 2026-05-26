import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Empty, Loading, Stepper } from "../components/ui";
import {
  checkinLines,
  getCheckoutLines,
  listOpenCheckouts,
  type CheckinLine,
} from "../lib/crud";
import { colors } from "../lib/theme";
import type { Checkout, CheckoutLine } from "../lib/types";

type ReturnState = Record<number, { good: number; damaged: number }>;

export default function Checkin() {
  const [checkouts, setCheckouts] = useState<Checkout[] | null>(null);
  const [selected, setSelected] = useState<Checkout | null>(null);
  const [lines, setLines] = useState<CheckoutLine[]>([]);
  const [ret, setRet] = useState<ReturnState>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listOpenCheckouts().then(setCheckouts);
  }, []);

  async function openCheckout(c: Checkout) {
    const ls = await getCheckoutLines(c.id);
    const open = ls.filter((l) => (l.outstanding ?? 0) > 0);
    setSelected(c);
    setLines(open);
    // Default: assume everything returns Good.
    const init: ReturnState = {};
    for (const l of open) init[l.id] = { good: l.outstanding ?? 0, damaged: 0 };
    setRet(init);
  }

  function setGood(lineId: number, outstanding: number, good: number) {
    setRet((p) => {
      const cur = p[lineId] ?? { good: 0, damaged: 0 };
      const damaged = Math.min(cur.damaged, outstanding - good);
      return { ...p, [lineId]: { good, damaged } };
    });
  }
  function setDamaged(lineId: number, outstanding: number, damaged: number) {
    setRet((p) => {
      const cur = p[lineId] ?? { good: 0, damaged: 0 };
      const good = Math.min(cur.good, outstanding - damaged);
      return { ...p, [lineId]: { good, damaged } };
    });
  }

  async function submit() {
    if (!selected) return;
    const payload: CheckinLine[] = lines.map((l) => ({
      line_id: l.id,
      equipment_id: l.equipment_id,
      good: ret[l.id]?.good ?? 0,
      damaged: ret[l.id]?.damaged ?? 0,
    }));
    const totalReturning = payload.reduce((s, p) => s + p.good + p.damaged, 0);
    if (totalReturning === 0) {
      Alert.alert("Nothing to return", "Set how many units are coming back.");
      return;
    }
    setSubmitting(true);
    try {
      await checkinLines(payload);
      const damaged = payload.reduce((s, p) => s + p.damaged, 0);
      Alert.alert(
        "Checked in",
        damaged > 0
          ? `${damaged} damaged unit(s) moved to maintenance.`
          : "All returned units are back in stock.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Check-in failed", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!checkouts) return <Loading />;

  // Step 1: pick a checkout.
  if (!selected) {
    if (checkouts.length === 0) {
      return <Empty text="Nothing is checked out right now." />;
    }
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.section}>Open checkouts</Text>
        {checkouts.map((c) => {
          const overdue = c.due_date < new Date().toISOString().slice(0, 10);
          return (
            <Pressable key={c.id} onPress={() => openCheckout(c)} style={styles.coCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.coName}>{c.client_name}</Text>
                <Text style={styles.coSub}>
                  {c.open_units} unit(s) out · due {c.due_date}
                </Text>
              </View>
              {overdue && <Text style={styles.overdueTag}>Overdue</Text>}
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  // Step 2: per-line return entry.
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Pressable onPress={() => setSelected(null)} style={styles.backLink}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={styles.backLinkText}>Back to checkouts</Text>
      </Pressable>
      <Text style={styles.section}>{selected.client_name} — inspect & return</Text>

      {lines.map((l) => {
        const outstanding = l.outstanding ?? 0;
        const r = ret[l.id] ?? { good: 0, damaged: 0 };
        return (
          <View key={l.id} style={styles.lineCard}>
            <Text style={styles.lineName}>{l.equipment_name}</Text>
            <Text style={styles.lineSub}>{outstanding} unit(s) still out</Text>

            <View style={styles.splitRow}>
              <Text style={[styles.splitLabel, { color: colors.statusAvailable }]}>Good</Text>
              <Stepper
                value={r.good}
                min={0}
                max={outstanding - r.damaged}
                onChange={(n) => setGood(l.id, outstanding, n)}
              />
            </View>
            <View style={styles.splitRow}>
              <Text style={[styles.splitLabel, { color: colors.statusMaintenance }]}>
                Damaged / repair
              </Text>
              <Stepper
                value={r.damaged}
                min={0}
                max={outstanding - r.good}
                onChange={(n) => setDamaged(l.id, outstanding, n)}
              />
            </View>
            {r.good + r.damaged < outstanding && (
              <Text style={styles.partialHint}>
                {outstanding - r.good - r.damaged} unit(s) will stay checked out.
              </Text>
            )}
          </View>
        );
      })}

      <View style={{ height: 8 }} />
      <Button
        title={submitting ? "Processing…" : "Confirm Check-In"}
        onPress={submit}
        disabled={submitting}
      />
      <View style={{ height: 10 }} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 14 },
  coCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  coName: { fontSize: 15, fontWeight: "700", color: colors.text },
  coSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  overdueTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#b91c1c",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  backLink: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backLinkText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  lineCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  lineName: { fontSize: 15, fontWeight: "700", color: colors.text },
  lineSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 8 },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  splitLabel: { fontSize: 14, fontWeight: "700" },
  partialHint: { fontSize: 12, color: colors.statusOut, marginTop: 8, fontWeight: "600" },
});
