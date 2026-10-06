"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  variant?: string;
  stock: number;
};

type CartState = {
  lines: CartLine[];
  couponCode: string | null;
  add: (line: Omit<CartLine, "key" | "quantity">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
};

export const lineKey = (productId: string, variant?: string) => `${productId}|${variant ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: null,
      add: (line, qty = 1) =>
        set((s) => {
          const key = lineKey(line.productId, line.variant);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return { lines: s.lines.map((l) => (l.key === key ? { ...l, ...line, quantity: Math.min(l.quantity + qty, line.stock) } : l)) };
          }
          return { lines: [...s.lines, { ...line, key, quantity: Math.min(qty, line.stock) }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(qty, l.stock)) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], couponCode: null }),
      setCoupon: (couponCode) => set({ couponCode }),
    }),
    { name: "accessoires-plus-cart", version: 1, skipHydration: true },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
