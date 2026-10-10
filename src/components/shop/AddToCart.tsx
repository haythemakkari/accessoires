"use client";
import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { useAddedSheet } from "@/stores/addedSheet";
import { useUser } from "@/stores/user";
import { useVariantChoice } from "./VariantContext";
import { mediaUrl } from "@/lib/media";
import { optionImage } from "@/lib/variants";
import { finalUnitPrice } from "@/lib/packaging";
import { formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/data";

export function AddToCart({ product }: { product: ProductDTO }) {
  const add = useCart((s) => s.add);
  const isAdmin = useUser((s) => s.user?.role === "admin");
  const [qty, setQty] = useState(1);
  const { choice, select, selectedImage, packagings, packaging, selectPackaging } = useVariantChoice();
  const out = product.stock <= 0;
  const missing = product.variants.find((v) => !choice[v.name]);

  const onAdd = () => {
    if (isAdmin) return toast.error("Un compte administrateur ne peut pas passer de commande");
    if (missing) return toast.error(`Choisissez : ${missing.name}`);
    const variant = product.variants.length ? product.variants.map((v) => choice[v.name]).join(" / ") : undefined;
    // Prix final unitaire = prix de base + supplément du packaging (le serveur le recalcule à la commande).
    const supplement = packaging?.price ?? 0;
    const unit = finalUnitPrice(product.currentPrice, supplement);
    // l'image du panier = photo de la couleur choisie (sinon image principale)
    add({ productId: product._id, slug: product.slug, name: product.name, image: selectedImage ?? product.images[0], price: unit, variant, packagingId: packaging?._id, packagingName: packaging?.name, packagingPrice: packaging ? supplement : undefined, stock: product.stock }, qty);
    const oldBase = product.currentPrice < product.price ? product.price : product.compareAtPrice && product.compareAtPrice > product.currentPrice ? product.compareAtPrice : null;
    useAddedSheet.getState().show({ productId: product._id, slug: product.slug, name: product.name, image: selectedImage ?? product.images[0], price: unit, oldPrice: oldBase == null ? null : finalUnitPrice(oldBase, supplement), variant, packagingName: packaging?.name, quantity: qty });
  };

  return (
    <div className="space-y-6">
      {product.variants.map((v) => (
        <div key={v.name}>
          <p className="label">{v.name}{choice[v.name] && <span className="ml-2 normal-case tracking-normal text-ink">· {choice[v.name]}</span>}</p>
          <div className="flex flex-wrap gap-2">
            {v.options.map((o) => {
              const img = optionImage(v, o);
              const active = choice[v.name] === o;
              return (
                <button key={o} type="button" onClick={() => select(v.name, o)} aria-pressed={active}
                  className={`flex items-center gap-2 rounded-full border py-1.5 text-sm transition ${img ? "pl-1.5 pr-4" : "px-4 py-2"} ${active ? "border-ink bg-ink text-sand-50" : "border-ink/20 hover:border-ink"}`}>
                  {img && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(img, 160)} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 rounded-full object-cover" />}
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {packagings.length > 0 && (
        <fieldset>
          <legend className="label">Packaging{packaging && <span className="ml-2 normal-case tracking-normal text-ink">· {packaging.name}</span>}</legend>
          <div className="space-y-2" role="radiogroup" aria-label="Packaging">
            {[null, ...packagings].map((o) => {
              const active = (packaging?._id ?? null) === (o?._id ?? null);
              return (
                <button key={o?._id ?? "standard"} type="button" role="radio" aria-checked={active} onClick={() => selectPackaging(o?._id ?? null)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-ink bg-sand-100 ring-1 ring-ink" : "border-ink/20 hover:border-ink/50"}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-ink" : "border-ink/30"}`}>{active && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}</span>
                  {o?.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(o.image, 160)} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{o ? o.name : "Emballage standard"}</span>
                    {o?.description && <span className="block text-xs text-ink/60">{o.description}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{!o ? "Inclus" : o.price > 0 ? `+ ${formatPrice(o.price)}` : "Offert"}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
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
      <Link href="/cart" className="block text-center text-sm text-ink/60 underline underline-offset-4 hover:text-ink">Voir mon panier</Link>
    </div>
  );
}
