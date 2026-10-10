import { create } from "zustand";

export type AddedItem = { productId: string; slug: string; name: string; image?: string; price: number; oldPrice?: number | null; variant?: string; packagingName?: string; quantity: number };

/** Panneau « Ajouté au panier » : affiché après chaque ajout (fiche produit ou bouton rapide). */
export const useAddedSheet = create<{ item: AddedItem | null; show: (item: AddedItem) => void; hide: () => void }>((set) => ({
  item: null,
  show: (item) => set({ item }),
  hide: () => set({ item: null }),
}));
