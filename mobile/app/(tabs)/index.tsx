import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui";
import { getDashboardStats, type DashboardStats } from "../../lib/crud";
import { colors } from "../../lib/theme";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getDashboardStats().then(setStats);
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Stock Overview</Text>
      <View style={styles.grid}>
        <StatCard label="Available" value={stats?.available} color={colors.statusAvailable} icon="checkmark-circle" />
        <StatCard label="Checked Out" value={stats?.out} color={colors.statusOut} icon="arrow-up-circle" />
        <StatCard label="In Repair" value={stats?.maintenance} color={colors.statusMaintenance} icon="construct" />
        <StatCard label="Overdue" value={stats?.overdueCheckouts} color="#7c3aed" icon="alert-circle" />
      </View>
      <Text style={styles.totalNote}>{stats?.totalUnits ?? "—"} total units tracked</Text>

      <Text style={[styles.heading, { marginTop: 18 }]}>Quick Actions</Text>
      <View style={{ gap: 10 }}>
        <Button title="Check Out Equipment" onPress={() => router.push("/checkout")} />
        <Button title="Check In Equipment" variant="ghost" onPress={() => router.push("/checkin")} />
      </View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value?: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  statValue: { fontSize: 30, fontWeight: "800", color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  totalNote: { fontSize: 13, color: colors.textMuted, marginTop: 10, fontWeight: "600" },
});
