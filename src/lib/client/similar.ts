"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { useUser } from "@/stores/user";
import { fetcher } from "./fetcher";

/** Produit suggéré (format léger renvoyé par /api/products/[slug]/related). */
export type Similar = { _id: string; name: string; slug: string; image: string | null; price: number; salePrice: number | null; isOnSale: boolean; compareAtPrice: number | null; currentPrice: number; stock: number; hasVariants: boolean };

/** Produits similaires à un produit (null = chargement). */
export function useSimilar(slug: string | undefined) {
  const [items, setItems] = useState<Similar[] | null>(null);
  useEffect(() => {
    if (!slug) { setItems([]); return; }
    let off = false;
    fetcher<{ items: Similar[] }>(`/api/products/${slug}/related`).then((r) => !off && setItems(r.items)).catch(() => !off && setItems([]));
    return () => { off = true; };
  }, [slug]);
  return items;
}

/** Ajout rapide (1 unité) d'un produit suggéré sans options. */
export function useQuickAddSimilar() {
  const add = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const isAdmin = useUser((s) => s.user?.role === "admin");
  return (p: Similar) => {
    if (isAdmin) return toast.error("Un compte administrateur ne peut pas passer de commande");
    const have = lines.find((l) => l.productId === p._id && !l.variant)?.quantity ?? 0;
    if (have >= p.stock) return toast.info("Quantité maximale déjà dans votre panier", { description: p.name });
    add({ productId: p._id, slug: p.slug, name: p.name, image: p.image ?? undefined, price: p.currentPrice, stock: p.stock }, 1);
    toast.success("Ajouté au panier", { description: p.name });
  };
}
