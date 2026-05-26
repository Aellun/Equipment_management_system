import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Empty, Loading, Stepper } from "../components/ui";
import { useCart } from "../lib/CartContext";
import { listAvailableEquipment, listCategories } from "../lib/crud";
import { colors } from "../lib/theme";
import type { Category, Equipment } from "../lib/types";

export default function CheckoutBrowse() {
  const cart = useCart();
  const [equipment, setEquipment] = useState<Equipment[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  const load = useCallback(() => {
    listAvailableEquipment().then(setEquipment);
    listCategories().then(setCategories);
  }, []);
  useFocusEffect(useCallback(() => load(), [load]));

  if (!equipment) return <Loading />;

  const shown = filter ? equipment.filter((e) => e.category === filter) : equipment;

  return (
    <View style={{ flex: 1 }}>
      {categories.length > 0 && (
        <View style={styles.filterBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 0, name: "All" } as Category, ...categories]}
            keyExtractor={(c) => String(c.id)}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
            renderItem={({ item }) => {
              const active = item.id === 0 ? filter === null : filter === item.name;
              return (
                <Pressable
                  onPress={() => setFilter(item.id === 0 ? null : item.name)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, active && { color: "#fff" }]}>{item.name}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <FlatList
        data={shown}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        ListEmptyComponent={<Empty text="No available equipment to check out." />}
        renderItem={({ item }) => {
          const inCart = cart.items.find((c) => c.equipment.id === item.id);
          return (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>
                  {item.category} · {item.available} available
                </Text>
              </View>
              {inCart ? (
                <Stepper
                  value={inCart.quantity}
                  min={0}
                  max={item.available ?? 1}
                  onChange={(n) => cart.setQuantity(item.id, n)}
                />
              ) : (
                <Pressable style={styles.addBtn} onPress={() => cart.add(item, 1)}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {cart.count > 0 && (
        <Pressable style={styles.cartBar} onPress={() => router.push("/cart")}>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cart.totalUnits}</Text>
          </View>
          <Text style={styles.cartBarText}>
            Review cart · {cart.count} item{cart.count > 1 ? "s" : ""}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.text },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  itemName: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cartBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    elevation: 5,
  },
  cartBadge: {
    backgroundColor: "#ffffff",
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  cartBadgeText: { color: colors.primary, fontWeight: "800", fontSize: 13 },
  cartBarText: { color: "#fff", fontWeight: "700", fontSize: 15, flex: 1 },
});
