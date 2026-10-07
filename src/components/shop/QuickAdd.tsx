"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { lineKey, useCart } from "@/stores/cart";
import { useUser } from "@/stores/user";

type Props = { id: string; slug: string; name: string; image?: string; price: number; stock: number; hasVariants: boolean };

/**
 * Bouton affiché sur la photo d'une carte produit : au survol sur ordinateur, toujours visible sur écran tactile
 * (pas de survol) et au clavier (focus). Produit à variantes : on envoie vers la fiche pour choisir l'option.
 */
const REVEAL =
  "absolute inset-x-3 bottom-3 z-10 flex translate-y-3 items-center justify-center gap-2 rounded-full bg-white/95 py-2.5 text-xs font-semibold text-ink opacity-0 shadow-lg transition duration-300 hover:bg-ink hover:text-sand-50 " +
  "group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100";

export function QuickAdd({ id, slug, name, image, price, stock, hasVariants }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.find((l) => l.key === lineKey(id))?.quantity ?? 0);
  const isAdmin = useUser((s) => s.user?.role === "admin");

  if (stock <= 0) return null;
  if (hasVariants) return <Link href={`/products/${slug}`} className={REVEAL}>Choisir les options</Link>;

  const onAdd = () => {
    if (isAdmin) return toast.error("Un compte administrateur ne peut pas passer de commande");
    if (inCart >= stock) return toast.info("Quantité maximale déjà dans votre panier", { description: name });
    add({ productId: id, slug, name, image, price, stock }, 1);
    toast.success("Ajouté au panier", { description: name, action: { label: "Voir", onClick: () => router.push("/cart") } });
  };

  return (
    <button type="button" onClick={onAdd} className={REVEAL} aria-label={`Ajouter au panier : ${name}`}>
      <ShoppingBag size={15} /> Ajouter au panier
    </button>
  );
}
