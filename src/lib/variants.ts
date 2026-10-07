/** Variantes de produit avec image par option (ex. couleur → photo de cette couleur). Fichier pur : utilisable côté navigateur et serveur. */
export type OptionImage = { option: string; image: string };
export type VariantLike = { name: string; options: string[]; optionImages?: OptionImage[] };

export const optionImage = (v: VariantLike, option?: string) => (option ? v.optionImages?.find((o) => o.option === option)?.image : undefined);

/**
 * Image à afficher pour la sélection du client. Si plusieurs variantes ont des images, la première (dans l'ordre défini par l'admin) l'emporte.
 * choice : { Couleur: "Noir", Taille: "M" }
 */
export function imageForChoice(variants: VariantLike[], choice: Record<string, string>): string | undefined {
  for (const v of variants) {
    const img = optionImage(v, choice[v.name]);
    if (img) return img;
  }
  return undefined;
}

/** Même chose à partir de la chaîne enregistrée dans le panier / la commande : « Noir / M » (une valeur par variante, dans l'ordre). */
export function imageForVariantString(variants: VariantLike[], variant?: string): string | undefined {
  if (!variant) return undefined;
  const parts = variant.split(" / ");
  return imageForChoice(variants, Object.fromEntries(variants.map((v, i) => [v.name, parts[i] ?? ""])));
}

/** Toutes les images de couleurs d'un produit (sans doublon) : utile pour le SEO et le préchargement. */
export const allOptionImages = (variants: VariantLike[]) => [...new Set(variants.flatMap((v) => v.optionImages?.map((o) => o.image) ?? []))];
