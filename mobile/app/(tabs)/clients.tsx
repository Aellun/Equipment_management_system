import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Field } from "../../components/ui";
import { addClient, deleteClient, listClients, updateClient } from "../../lib/crud";
import { colors } from "../../lib/theme";
import type { Client } from "../../lib/types";

export default function ClientsScreen() {
  const [items, setItems] = useState<Client[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idProof, setIdProof] = useState("");

  const load = useCallback(() => {
    listClients().then(setItems);
  }, []);
  useFocusEffect(useCallback(() => load(), [load]));

  function openAdd() {
    setEditing(null);
    setName(""); setPhone(""); setEmail(""); setIdProof("");
    setModal(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    setName(c.name); setPhone(c.phone ?? ""); setEmail(c.email ?? ""); setIdProof(c.id_proof_ref ?? "");
    setModal(true);
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert("Missing field", "Client name is required.");
      return;
    }
    if (editing) await updateClient(editing.id, name, phone, email, idProof);
    else await addClient(name, phone, email, idProof);
    setModal(false);
    load();
  }

  function confirmDelete(c: Client) {
    Alert.alert("Delete client", `Delete "${c.name}"? This removes their history.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteClient(c.id); load(); } },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No clients yet. Tap + to add a borrower.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  {[item.phone, item.email].filter(Boolean).join(" · ") || "No contact info"}
                </Text>
              </View>
              <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
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
          <Text style={styles.modalTitle}>{editing ? "Edit Client" : "Add Client"}</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" autoCapitalize="words" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="07xx xxx xxx" keyboardType="phone-pad" />
          <Field label="Email (optional)" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="ID / Reference (optional)" value={idProof} onChangeText={setIdProof} placeholder="ID number or note" />
          <View style={{ height: 8 }} />
          <Button title={editing ? "Save Changes" : "Add Client"} onPress={save} />
          <View style={{ height: 10 }} />
          <Button title="Cancel" variant="ghost" onPress={() => setModal(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  iconBtn: { padding: 6, marginLeft: 6 },
  fab: {
    position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", elevation: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 18 },
});
