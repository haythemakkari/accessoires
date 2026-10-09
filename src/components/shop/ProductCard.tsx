import Link from "next/link";
import type { ProductDTO } from "@/lib/data";
import { Price } from "@/components/ui/Price";
import { ProductImage } from "@/components/ui/ProductImage";
import { mediaSrcSet, mediaUrl } from "@/lib/media";
import { QuickAdd } from "./QuickAdd";

export function ProductCard({ p, priority = false, headingLevel = 3 }: { p: ProductDTO; priority?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const out = p.stock <= 0;
  const sale = p.isOnSale && p.salePrice != null && p.salePrice < p.price;
  const discount = sale ? Math.round((1 - p.salePrice! / p.price) * 100) : 0;
  const href = `/products/${p.slug}`;
  return (
    <div className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand-100">
        {/* Clic sur la photo : ouvre la page du produit */}
        {/* Le nom ci-dessous est le lien accessible : celui-ci (photo) est ignoré par les lecteurs d'écran et le clavier pour éviter un doublon */}
        <Link href={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
          <div className="h-full w-full transition duration-700 ease-out group-hover:scale-105">
            <ProductImage src={p.images[0]} alt="" priority={priority} />
          </div>
          {p.images[1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(p.images[1], 480)} srcSet={mediaSrcSet(p.images[1])} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" alt="" loading="lazy" decoding="async" fetchPriority="low" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {sale && <span className="rounded-full bg-clay px-2.5 py-1 text-xs font-semibold text-white">-{discount}%</span>}
            {p.isFeatured && !sale && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-sand-50">Sélection</span>}
          </div>
          {out && <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium backdrop-blur-[1px]">Épuisé</div>}
        </Link>
        {/* Bouton « Ajouter au panier » (hors du lien : pas de bouton imbriqué dans un lien) */}
        <QuickAdd id={p._id} slug={p.slug} name={p.name} image={p.images[0]} price={p.currentPrice} stock={p.stock} hasVariants={p.variants.length > 0} oldPrice={p.currentPrice < p.price ? p.price : p.compareAtPrice && p.compareAtPrice > p.currentPrice ? p.compareAtPrice : null} />
      </div>
      <Link href={href} className="mt-3 block space-y-0.5 px-0.5">
        <p className="text-xs uppercase tracking-widest text-ink/60">{p.category?.name}</p>
        <Heading className="line-clamp-1 text-sm font-medium group-hover:text-brass-dark">{p.name}</Heading>
        <Price price={p.price} salePrice={p.salePrice} compareAt={p.compareAtPrice} onSale={p.isOnSale} />
      </Link>
    </div>
  );
}
