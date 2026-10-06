"use client";
import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { useUser } from "@/stores/user";
import type { ProductDTO } from "@/lib/data";

export function AddToCart({ product }: { product: ProductDTO }) {
  const add = useCart((s) => s.add);
  const isAdmin = useUser((s) => s.user?.role === "admin");
  const [qty, setQty] = useState(1);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const out = product.stock <= 0;
  const missing = product.variants.find((v) => !choice[v.name]);

  const onAdd = () => {
    if (isAdmin) return toast.error("Un compte administrateur ne peut pas passer de commande");
    if (missing) return toast.error(`Choisissez : ${missing.name}`);
    const variant = product.variants.length ? product.variants.map((v) => choice[v.name]).join(" / ") : undefined;
    add({ productId: product._id, slug: product.slug, name: product.name, image: product.images[0], price: product.currentPrice, variant, stock: product.stock }, qty);
    toast.success("Ajouté au panier", { description: product.name, action: { label: "Voir", onClick: () => (window.location.href = "/cart") } });
  };

  return (
    <div className="space-y-6">
      {product.variants.map((v) => (
        <div key={v.name}>
          <p className="label">{v.name}{choice[v.name] && <span className="ml-2 normal-case tracking-normal text-ink">· {choice[v.name]}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {v.options.map((o) => (
              <button key={o} onClick={() => setChoice({ ...choice, [v.name]: o })}
                className={`rounded-full border px-4 py-2 text-sm transition ${choice[v.name] === o ? "border-ink bg-ink text-sand-50" : "border-ink/20 hover:border-ink"}`}>{o}</button>
            ))}
          </div>
        </div>
      ))}
      <p className={`text-sm ${out ? "text-clay" : product.stock <= 5 ? "text-amber-700" : "text-emerald-700"}`}>
        {out ? "Épuisé" : product.stock <= 5 ? `Plus que ${product.stock} en stock` : "En stock"}
      </p>
      <div className="flex gap-3">
        <div className="flex items-center rounded-full border border-ink/20">
          <button className="p-3 disabled:opacity-30" disabled={qty <= 1 || out} onClick={() => setQty(qty - 1)} aria-label="Diminuer"><Minus size={16} /></button>
          <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
          <button className="p-3 disabled:opacity-30" disabled={qty >= product.stock || out} onClick={() => setQty(qty + 1)} aria-label="Augmenter"><Plus size={16} /></button>
        </div>
        <button onClick={onAdd} disabled={out} className="btn-primary flex-1"><ShoppingBag size={18} /> {out ? "Indisponible" : "Ajouter au panier"}</button>
      </div>
      <Link href="/cart" className="block text-center text-sm text-ink/55 underline underline-offset-4 hover:text-ink">Voir mon panier</Link>
    </div>
  );
}
