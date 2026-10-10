"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { imageForChoice, type VariantLike } from "@/lib/variants";
import type { PackagingOption } from "@/lib/packaging";

type Ctx = {
  choice: Record<string, string>;
  select: (variant: string, option: string) => void;
  selectedImage?: string;
  /** Options de packaging proposées pour ce produit (déjà filtrées : actives seulement). */
  packagings: PackagingOption[];
  /** Option choisie (null = emballage standard, sans supplément). */
  packaging: PackagingOption | null;
  selectPackaging: (id: string | null) => void;
};
const VariantCtx = createContext<Ctx | null>(null);

/** Partage la sélection d'options (couleur, taille…) et de packaging entre la galerie, le prix et le bloc d'achat de la fiche produit. */
export function VariantProvider({ variants, packagings = [], children }: { variants: VariantLike[]; packagings?: PackagingOption[]; children: ReactNode }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  // L'option par défaut définie par l'admin est présélectionnée ; le client peut revenir à l'emballage standard.
  const [packagingId, setPackagingId] = useState<string | null>(() => packagings.find((o) => o.isDefault)?._id ?? null);
  const value = useMemo<Ctx>(
    () => ({
      choice,
      select: (v, o) => setChoice((c) => ({ ...c, [v]: o })),
      selectedImage: imageForChoice(variants, choice),
      packagings,
      packaging: packagings.find((o) => o._id === packagingId) ?? null,
      selectPackaging: setPackagingId,
    }),
    [choice, variants, packagings, packagingId],
  );
  return <VariantCtx.Provider value={value}>{children}</VariantCtx.Provider>;
}

export function useVariantChoice(): Ctx {
  const c = useContext(VariantCtx);
  if (!c) throw new Error("useVariantChoice doit être utilisé dans <VariantProvider>");
  return c;
}
