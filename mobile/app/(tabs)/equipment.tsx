import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Card, Field, Stepper, StockPills } from "../../components/ui";
import {
  addEquipment,
  clearMaintenance,
  deleteEquipment,
  listCategories,
  listEquipment,
  updateEquipment,
} from "../../lib/crud";
import { colors } from "../../lib/theme";
import type { Category, Equipment } from "../../lib/types";

export default function EquipmentScreen() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(() => {
    listEquipment().then(setItems);
    listCategories().then(setCategories);
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  function openAdd() {
    setEditing(null);
    setName("");
    setCategory(categories[0]?.name ?? "");
    setQuantity(1);
    setModal(true);
  }

  function openEdit(eq: Equipment) {
    setEditing(eq);
    setName(eq.name);
    setCategory(eq.category);
    setQuantity(eq.quantity);
    setModal(true);
  }

  async function save() {
    if (!name.trim() || !category) {
      Alert.alert("Missing fields", "Name and category are required.");
      return;
    }
    try {
      if (editing) await updateEquipment(editing.id, name, category, quantity);
      else await addEquipment(name, category, quantity);
      setModal(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not save equipment");
    }
  }

  function confirmDelete(eq: Equipment) {
    if ((eq.out ?? 0) > 0) {
      Alert.alert("Can't delete", `${eq.out} unit(s) are currently checked out.`);
      return;
    }
    Alert.alert("Delete equipment", `Delete "${eq.name}"? This removes its history.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEquipment(eq.id);
          load();
        },
      },
    ]);
  }

  function repairPrompt(eq: Equipment) {
    Alert.prompt?.(
      "Return from maintenance",
      `How many of ${eq.in_maintenance} unit(s) are fixed?`,
      async (text) => {
        const n = parseInt(text || "0", 10);
        if (n > 0) {
          try {
            await clearMaintenance(eq.id, n);
            load();
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        }
      },
      "plain-text",
      String(eq.in_maintenance),
      "number-pad"
    );
    // Android lacks Alert.prompt — fall back to clearing all.
    if (!Alert.prompt) {
      Alert.alert("Return from maintenance", `Mark all ${eq.in_maintenance} unit(s) as fixed?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark fixed",
          onPress: async () => {
            await clearMaintenance(eq.id, eq.in_maintenance);
            load();
          },
        },
      ]);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No equipment yet. Tap + to add.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  {item.category} · {item.quantity} total
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <StockPills
                available={item.available ?? 0}
                out={item.out ?? 0}
                maintenance={item.in_maintenance}
              />
            </View>
            <View style={styles.actions}>
              {item.in_maintenance > 0 && (
                <Pressable onPress={() => repairPrompt(item)} style={styles.action}>
                  <Ionicons name="checkmark-done" size={18} color={colors.statusAvailable} />
                  <Text style={[styles.actionText, { color: colors.statusAvailable }]}>
                    Return from repair
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={() => openEdit(item)} style={styles.action}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} style={styles.action}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />

      <Pressable style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.modalTitle}>{editing ? "Edit Equipment" : "Add Equipment"}</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Wireless Microphone" />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.name)}
                style={[styles.chip, category === c.name && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === c.name && { color: "#fff" }]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>
            {editing ? "Total quantity owned" : "How many units?"}
          </Text>
          <Stepper value={quantity} onChange={setQuantity} min={1} max={9999} />
          {editing && (
            <Text style={styles.hint}>
              {(editing.out ?? 0) + editing.in_maintenance} unit(s) committed (out / in repair).
            </Text>
          )}

          <View style={{ height: 20 }} />
          <Button title={editing ? "Save Changes" : "Add Equipment"} onPress={save} />
          <View style={{ height: 10 }} />
          <Button title="Cancel" variant="ghost" onPress={() => setModal(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: "row", gap: 18, marginTop: 12, flexWrap: "wrap" },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.text },
});
