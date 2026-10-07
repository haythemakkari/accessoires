"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { imageForChoice, type VariantLike } from "@/lib/variants";

type Ctx = { choice: Record<string, string>; select: (variant: string, option: string) => void; selectedImage?: string };
const VariantCtx = createContext<Ctx | null>(null);

/** Partage la sélection d'options (couleur, taille…) entre la galerie et le bloc d'achat de la fiche produit. */
export function VariantProvider({ variants, children }: { variants: VariantLike[]; children: ReactNode }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const value = useMemo<Ctx>(
    () => ({ choice, select: (v, o) => setChoice((c) => ({ ...c, [v]: o })), selectedImage: imageForChoice(variants, choice) }),
    [choice, variants],
  );
  return <VariantCtx.Provider value={value}>{children}</VariantCtx.Provider>;
}

export function useVariantChoice(): Ctx {
  const c = useContext(VariantCtx);
  if (!c) throw new Error("useVariantChoice doit être utilisé dans <VariantProvider>");
  return c;
}
