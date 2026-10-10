import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { formatDate, formatPrice, plain } from "@/lib/utils";
import { Order } from "@/models/Order";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_LABEL } from "@/lib/status";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";

export const metadata = { title: "Détail commande" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const raw = await Order.findById(id).populate("user", "name email").lean();
  if (!raw) notFound();
  const o = plain(raw) as typeof raw & { user: { name: string; email: string } | null };
  return (
    <div className="space-y-4">
      <Link href="/admin/orders" className="text-sm text-slate-500 hover:text-slate-800">← Commandes</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><h1 className="font-mono text-xl font-semibold">{o.orderNumber}</h1><StatusBadge status={o.status} />{o.isGuest && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Commande invité</span>}</div>
        <OrderStatusSelect id={String(o._id)} status={o.status} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="a-card lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-2.5">Produit</th><th className="px-4 py-2.5">Prix</th><th className="px-4 py-2.5">Qté</th><th className="px-4 py-2.5 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {o.items.map((i, k) => <tr key={k}><td className="px-4 py-2.5">{i.name}{i.variant && <span className="text-slate-400"> · {i.variant}</span>}{i.packaging && <p className="text-xs text-indigo-600">Packaging : {i.packaging.name} (+{formatPrice(i.packaging.supplement)}) · produit {formatPrice(i.basePrice ?? i.price)}</p>}<p className="text-xs text-slate-400">{i.sku}</p></td><td className="px-4 py-2.5">{formatPrice(i.price)}</td><td className="px-4 py-2.5">{i.quantity}</td><td className="px-4 py-2.5 text-right">{formatPrice(i.price * i.quantity)}</td></tr>)}
            </tbody>
          </table>
          <div className="space-y-1 border-t border-slate-200 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span>{formatPrice(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Réduction {o.coupon?.code && `(${o.coupon.code})`}</span><span>-{formatPrice(o.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-slate-500">Livraison</span><span>{formatPrice(o.shippingFee)}</span></div>
            <div className="flex justify-between pt-1 text-base font-semibold"><span>Total</span><span>{formatPrice(o.total)}</span></div>
          </div>
        </section>
        <div className="space-y-4">
          <section className="a-card p-4 text-sm"><p className="a-label">Client</p>{o.customer?.fullName}<br />{o.customer?.phone}{o.customer?.email && <><br />{o.customer.email}</>}{o.user && <p className="mt-1 text-xs text-slate-400">Compte : {o.user.email}</p>}</section>
          <section className="a-card p-4 text-sm"><p className="a-label">Adresse</p>{o.address?.line}<br />{[o.address?.district, o.address?.city].filter(Boolean).join(", ")} {o.address?.postalCode}{o.address?.notes && <p className="mt-2 rounded bg-slate-50 p-2 text-slate-600">{o.address.notes}</p>}</section>
          <section className="a-card p-4 text-sm"><p className="a-label">Historique</p>
            <ul className="space-y-1">{o.statusHistory.map((h, k) => <li key={k} className="flex justify-between"><span>{STATUS_LABEL[h.status ?? ""]}</span><span className="text-slate-400">{formatDate(h.at as unknown as string)}</span></li>)}</ul>
            <p className="mt-3 text-xs text-slate-400">Créée le {formatDate(o.createdAt)} · modifiée le {formatDate(o.updatedAt)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
