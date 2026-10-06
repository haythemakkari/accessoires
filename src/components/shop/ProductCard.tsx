import Link from "next/link";
import type { ProductDTO } from "@/lib/data";
import { Price } from "@/components/ui/Price";
import { ProductImage } from "@/components/ui/ProductImage";

export function ProductCard({ p }: { p: ProductDTO }) {
  const out = p.stock <= 0;
  const sale = p.isOnSale && p.salePrice != null && p.salePrice < p.price;
  const discount = sale ? Math.round((1 - p.salePrice! / p.price) * 100) : 0;
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand-100">
        <div className="h-full w-full transition duration-700 ease-out group-hover:scale-105">
          <ProductImage src={p.images[0]} alt={p.name} />
        </div>
        {p.images[1] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images[1]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {sale && <span className="rounded-full bg-clay px-2.5 py-1 text-[11px] font-semibold text-white">-{discount}%</span>}
          {p.isFeatured && !sale && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-sand-50">Sélection</span>}
        </div>
        {out && <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium backdrop-blur-[1px]">Épuisé</div>}
        <span className="absolute inset-x-3 bottom-3 translate-y-3 rounded-full bg-white/95 py-2 text-center text-xs font-medium opacity-0 shadow transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Voir le produit
        </span>
      </div>
      <div className="mt-3 space-y-0.5 px-0.5">
        <p className="text-[11px] uppercase tracking-widest text-ink/45">{p.category?.name}</p>
        <h3 className="line-clamp-1 text-sm font-medium group-hover:text-brass-dark">{p.name}</h3>
        <Price price={p.price} salePrice={p.salePrice} compareAt={p.compareAtPrice} onSale={p.isOnSale} />
      </div>
    </Link>
  );
}
