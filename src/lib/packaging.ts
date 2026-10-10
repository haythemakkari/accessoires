/** Packaging personnalisé par produit : types et règles partagés (navigateur + serveur, fichier pur). */
export type PackagingOption = { _id: string; name: string; description?: string; image?: string; price: number; isAvailable: boolean; isDefault: boolean };
type WithPackaging<O extends { isAvailable: boolean } = PackagingOption> = { packagingEnabled?: boolean | null; packagings?: O[] | null };

/** Options réellement proposées au client : packaging activé pour le produit ET option disponible. */
export function availablePackagings<O extends { isAvailable: boolean }>(p: WithPackaging<O>): O[] {
  return p.packagingEnabled ? (p.packagings ?? []).filter((o) => o.isAvailable) : [];
}

/** Version publique d'un produit : seules les options actives sont exposées (les options indisponibles ne sortent jamais du serveur). */
export function publicProduct<O extends { isAvailable: boolean }, T extends WithPackaging<O>>(p: T): T {
  return { ...p, packagings: availablePackagings(p) };
}

export const hasPackagingChoice = <O extends { isAvailable: boolean }>(p: WithPackaging<O>) => availablePackagings(p).length > 0;

/** Identifiant de ligne de panier : produit + variante + packaging (sans packaging : même forme qu'avant, les anciens paniers restent valides). */
export const cartKey = (productId: string, variant?: string, packagingId?: string) => `${productId}|${variant ?? ""}${packagingId ? `|${packagingId}` : ""}`;

/** Prix final unitaire = prix de base du produit + supplément du packaging choisi. */
export const finalUnitPrice = (basePrice: number, supplement = 0) => Math.round((basePrice + supplement) * 100) / 100;

/** Entrée admin → documents Mongoose : l'identifiant d'une option existante devient son _id (les nouvelles options en reçoivent un). */
export function toPackagingDocs<T extends { id?: string }>(list: T[]) {
  return list.map(({ id, ...o }) => ({ ...(id ? { _id: id } : {}), ...o }));
}
