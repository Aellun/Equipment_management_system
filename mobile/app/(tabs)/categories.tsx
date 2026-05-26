import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Field } from "../../components/ui";
import { addCategory, deleteCategory, listCategories } from "../../lib/crud";
import { colors } from "../../lib/theme";
import type { Category } from "../../lib/types";

export default function CategoriesScreen() {
  const [items, setItems] = useState<Category[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const load = useCallback(() => {
    listCategories().then(setItems);
  }, []);
  useFocusEffect(useCallback(() => load(), [load]));

  async function save() {
    if (!name.trim()) {
      Alert.alert("Missing field", "Category name is required.");
      return;
    }
    try {
      await addCategory(name, desc);
      setName(""); setDesc(""); setModal(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message?.includes("UNIQUE") ? "That category already exists." : e.message);
    }
  }

  function confirmDelete(c: Category) {
    Alert.alert("Delete category", `Delete "${c.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteCategory(c.id); load(); } },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>No categories yet.</Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.description ? <Text style={styles.sub}>{item.description}</Text> : null}
              </View>
              <Pressable onPress={() => confirmDelete(item)} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        )}
      />
      <Pressable style={styles.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.modalTitle}>Add Category</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Cabling" autoCapitalize="words" />
          <Field label="Description (optional)" value={desc} onChangeText={setDesc} placeholder="Short description" />
          <View style={{ height: 8 }} />
          <Button title="Add Category" onPress={save} />
          <View style={{ height: 10 }} />
          <Button title="Cancel" variant="ghost" onPress={() => setModal(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  fab: {
    position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", elevation: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 18 },
});
