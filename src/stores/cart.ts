"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cartKey } from "@/lib/packaging";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  variant?: string;
  /** Packaging choisi (facultatif) : `price` est alors le prix FINAL unitaire (produit + supplément). */
  packagingId?: string;
  packagingName?: string;
  packagingPrice?: number;
  stock: number;
};

/** Un panier non modifié depuis plus de 30 jours est considéré comme abandonné et vidé à la réouverture. */
export const CART_MAX_AGE_MS = 30 * 24 * 3600 * 1000;
export const CART_STORAGE_KEY = "accessoires-plus-cart";

type CartState = {
  lines: CartLine[];
  couponCode: string | null;
  /** Date de la dernière modification (ms) : sert à l'expiration. */
  updatedAt: number;
  /** Remplace tout le panier (mise à jour depuis le catalogue ou depuis le compte). */
  setLines: (lines: CartLine[], couponCode?: string | null) => void;
  add: (line: Omit<CartLine, "key" | "quantity">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
};

export const lineKey = cartKey;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: null,
      updatedAt: 0,
      setLines: (lines, couponCode) => set((s) => ({ lines, couponCode: couponCode === undefined ? s.couponCode : couponCode, updatedAt: Date.now() })),
      add: (line, qty = 1) =>
        set((s) => {
          const key = lineKey(line.productId, line.variant, line.packagingId);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return { updatedAt: Date.now(), lines: s.lines.map((l) => (l.key === key ? { ...l, ...line, quantity: Math.min(l.quantity + qty, line.stock) } : l)) };
          }
          return { updatedAt: Date.now(), lines: [...s.lines, { ...line, key, quantity: Math.min(qty, line.stock) }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ updatedAt: Date.now(), lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(qty, l.stock)) } : l)) })),
      remove: (key) => set((s) => ({ updatedAt: Date.now(), lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], couponCode: null, updatedAt: 0 }),
      setCoupon: (couponCode) => set({ couponCode, updatedAt: Date.now() }),
    }),
    { name: CART_STORAGE_KEY, version: 2, skipHydration: true, partialize: (s) => ({ lines: s.lines, couponCode: s.couponCode, updatedAt: s.updatedAt }) as CartState, migrate: (old) => ({ ...(old as object), updatedAt: Date.now() }) as CartState },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
