import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { formatDate, formatPrice, plain } from "@/lib/utils";
import { Order } from "@/models/Order";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const metadata = { title: "Mes commandes", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser();
  await connectDB();
  const orders = plain(await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(100).lean());
  return (
    <div>
      <h1 className="h-display mb-6 text-3xl">Mes commandes</h1>
      {orders.length === 0 ? <p className="text-ink/55">Vous n’avez pas encore passé de commande.</p> : (
        <ul className="card divide-y divide-ink/10">
          {orders.map((o) => (
            <li key={String(o._id)}><Link href={`/account/orders/${o._id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-sand-50">
              <div><p className="font-mono text-sm font-medium">{o.orderNumber}</p><p className="text-xs text-ink/50">{formatDate(o.createdAt)} · {o.items.length} article{o.items.length > 1 ? "s" : ""}</p></div>
              <div className="flex items-center gap-4"><StatusBadge status={o.status} /><span className="text-sm font-semibold">{formatPrice(o.total)}</span></div>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
