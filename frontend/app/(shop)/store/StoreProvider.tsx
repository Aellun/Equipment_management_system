"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Cart } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const TOKEN_KEY = "ahadi_cart_token";

function getToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

type StoreContextValue = {
  cart: Cart | null;
  cartCount: number;
  token: string;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: number, qty?: number) => Promise<boolean>;
  updateItem: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(getToken());
  }, []);

  const refreshCart = useCallback(async () => {
    const t = getToken();
    try {
      const res = await fetch(`${API}/cart/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: t }),
      });
      if (res.ok) setCart(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (token) refreshCart();
  }, [token, refreshCart]);

  const addToCart = useCallback(async (variantId: number, qty = 1) => {
    const t = getToken();
    try {
      const res = await fetch(`${API}/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: t, variant_id: variantId, quantity: qty }),
      });
      if (!res.ok) return false;
      setCart(await res.json());
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateItem = useCallback(async (itemId: number, qty: number) => {
    try {
      const res = await fetch(`${API}/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      if (res.ok) setCart(await res.json());
    } catch { /* ignore */ }
  }, []);

  const removeItem = useCallback(async (itemId: number) => {
    try {
      const res = await fetch(`${API}/cart/items/${itemId}`, { method: "DELETE" });
      if (res.ok) setCart(await res.json());
    } catch { /* ignore */ }
  }, []);

  const cartCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <StoreContext.Provider value={{ cart, cartCount, token, refreshCart, addToCart, updateItem, removeItem }}>
      {children}
    </StoreContext.Provider>
  );
}
