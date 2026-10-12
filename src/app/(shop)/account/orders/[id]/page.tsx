import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { formatDate, formatPrice, plain } from "@/lib/utils";
import { Order } from "@/models/Order";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProductImage } from "@/components/ui/ProductImage";
import { OrderTimeline } from "@/components/shop/OrderTimeline";

export const metadata = { title: "Détail de la commande", robots: { index: false } };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const raw = await Order.findOne({ _id: id, user: user._id }).lean(); // filtré par propriétaire
  if (!raw) notFound();
  const o = plain(raw);
  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="text-sm text-ink/60 hover:text-ink">← Mes commandes</Link>
      {/* Résumé : produit, n° et date de la commande */}
      <section className="card flex items-center gap-4 p-4 sm:p-5" aria-label="Résumé de la commande">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-sand-100 sm:h-24 sm:w-20"><ProductImage src={o.items[0]?.image ?? undefined} alt={o.items[0]?.name ?? ""} sizes="80px" /></div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold">{o.items[0]?.name}{o.items.length > 1 && <span className="font-normal text-ink/60"> + {o.items.length - 1} autre{o.items.length > 2 ? "s" : ""} article{o.items.length > 2 ? "s" : ""}</span>}</p>
          {(o.items[0]?.variant || o.items[0]?.packaging) && <p className="text-sm text-ink/60">{[o.items[0].variant, o.items[0].packaging && `Packaging ${o.items[0].packaging.name}`].filter(Boolean).join(" · ")}</p>}
          <p className="mt-1 text-lg font-bold">{formatPrice(o.total)}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-ink/60">
          <p className="font-mono text-sm font-medium text-ink">{o.orderNumber}</p>
          <p className="mt-1">Passée le {formatDate(o.createdAt)}</p>
        </div>
      </section>

      {/* Suivi : étapes validées avec date et heure, étape en cours, étapes à venir */}
      <section className="card p-5 sm:p-6" aria-labelledby="suivi-title">
        <div className="mb-5 flex items-center justify-between gap-3"><h1 id="suivi-title" className="h-display text-2xl">Suivi de la commande</h1><StatusBadge status={o.status} /></div>
        <OrderTimeline status={o.status} history={o.statusHistory} createdAt={o.createdAt} />
      </section>

      <div className="card divide-y divide-ink/10">
        {o.items.map((i, k) => (
          <div key={k} className="flex items-center justify-between gap-3 p-4 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              {/* Petite photo du produit (celle de la couleur commandée) */}
              <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-sand-100"><ProductImage src={i.image ?? undefined} alt={i.name} sizes="48px" /></div>
              <span className="min-w-0">{i.quantity} × {i.name}{i.variant && <span className="text-ink/60"> ({i.variant})</span>}{i.packaging && <span className="block text-xs text-ink/60">Packaging : {i.packaging.name}{i.packaging.supplement > 0 ? ` (+${formatPrice(i.packaging.supplement)})` : ""}</span>}</span>
            </div>
            <span className="shrink-0">{formatPrice(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="space-y-1 p-4 text-sm">
          <div className="flex justify-between"><span className="text-ink/60">Sous-total</span><span>{formatPrice(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Réduction {o.coupon?.code && `(${o.coupon.code})`}</span><span>-{formatPrice(o.discount)}</span></div>}
          {o.giftBox && <div className="flex justify-between"><span className="text-ink/60">Box cadeau</span><span>{formatPrice(o.giftBox.price)}</span></div>}
          <div className="flex justify-between"><span className="text-ink/60">Livraison</span><span>{o.shippingFee ? formatPrice(o.shippingFee) : "Offerte"}</span></div>
          <div className="flex justify-between pt-2 text-base font-semibold"><span>Total</span><span>{formatPrice(o.total)}</span></div>
        </div>
      </div>
      {o.giftBox?.message && <div className="card p-5 text-sm"><p className="label">Message de la carte (box cadeau)</p><p className="whitespace-pre-wrap">{o.giftBox.message}</p></div>}
      <div className="grid gap-4">
        <div className="card p-5 text-sm"><p className="label">Livraison</p>{o.customer?.fullName}<br />{o.address?.line}<br />{[o.address?.district, o.address?.city].filter(Boolean).join(", ")} {o.address?.postalCode}<br />{o.customer?.phone}</div>
      </div>
    </div>
  );
}
