import { create } from "zustand";

/** Ouverture du panneau « Mon panier » depuis n'importe quel composant (icône de l'en-tête, notification d'ajout…). */
export const useCartDrawer = create<{ open: boolean; set: (open: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));
