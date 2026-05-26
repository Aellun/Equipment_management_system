import React, { createContext, useContext, useMemo, useState } from "react";
import type { CartItem, Equipment } from "./types";

interface CartState {
  items: CartItem[];
  count: number; // distinct equipment types
  totalUnits: number;
  add: (equipment: Equipment, quantity?: number) => void;
  setQuantity: (equipmentId: number, quantity: number) => void;
  remove: (equipmentId: number) => void;
  clear: () => void;
  has: (equipmentId: number) => boolean;
}

const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartState>(() => {
    const clampToAvailable = (it: CartItem): CartItem => ({
      ...it,
      quantity: Math.max(1, Math.min(it.quantity, it.equipment.available ?? 1)),
    });

    return {
      items,
      count: items.length,
      totalUnits: items.reduce((s, i) => s + i.quantity, 0),
      add: (equipment, quantity = 1) =>
        setItems((prev) => {
          const existing = prev.find((i) => i.equipment.id === equipment.id);
          if (existing) {
            return prev.map((i) =>
              i.equipment.id === equipment.id
                ? clampToAvailable({ ...i, quantity: i.quantity + quantity })
                : i
            );
          }
          return [...prev, clampToAvailable({ equipment, quantity })];
        }),
      setQuantity: (equipmentId, quantity) =>
        setItems((prev) =>
          prev
            .map((i) =>
              i.equipment.id === equipmentId
                ? clampToAvailable({ ...i, quantity })
                : i
            )
            .filter((i) => i.quantity > 0)
        ),
      remove: (equipmentId) =>
        setItems((prev) => prev.filter((i) => i.equipment.id !== equipmentId)),
      clear: () => setItems([]),
      has: (equipmentId) => items.some((i) => i.equipment.id === equipmentId),
    };
  }, [items]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
