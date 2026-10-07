import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { formatDate, formatPrice, plain } from "@/lib/utils";
import { Order } from "@/models/Order";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_LABEL } from "@/lib/status";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="h-display text-3xl">{o.orderNumber}</h1><p className="text-sm text-ink/60">Passée le {formatDate(o.createdAt)}</p></div>
        <StatusBadge status={o.status} />
      </div>
      <div className="card divide-y divide-ink/10">
        {o.items.map((i, k) => (
          <div key={k} className="flex justify-between gap-3 p-4 text-sm">
            <span>{i.quantity} × {i.name}{i.variant && <span className="text-ink/60"> ({i.variant})</span>}</span><span>{formatPrice(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="space-y-1 p-4 text-sm">
          <div className="flex justify-between"><span className="text-ink/60">Sous-total</span><span>{formatPrice(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Réduction {o.coupon?.code && `(${o.coupon.code})`}</span><span>-{formatPrice(o.discount)}</span></div>}
          <div className="flex justify-between"><span className="text-ink/60">Livraison</span><span>{o.shippingFee ? formatPrice(o.shippingFee) : "Offerte"}</span></div>
          <div className="flex justify-between pt-2 text-base font-semibold"><span>Total</span><span>{formatPrice(o.total)}</span></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5 text-sm"><p className="label">Livraison</p>{o.customer?.fullName}<br />{o.address?.line}<br />{o.address?.city} {o.address?.postalCode}<br />{o.customer?.phone}</div>
        <div className="card p-5 text-sm"><p className="label">Historique</p>
          <ul className="space-y-1">{o.statusHistory.map((h, k) => <li key={k} className="flex justify-between"><span>{STATUS_LABEL[h.status ?? ""]}</span><span className="text-ink/60">{formatDate(h.at as unknown as string)}</span></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
