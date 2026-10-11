import Link from "next/link";
import { Gift } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { formatDate, formatPrice, plain } from "@/lib/utils";
import { Order } from "@/models/Order";
import { Coupon } from "@/models/Coupon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExchangeRequests } from "@/components/shop/ExchangeRequests";

export const metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountDashboard() {
  const user = await requireUser();
  await connectDB();
  const [orders, welcome, count] = await Promise.all([
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(3).lean(),
    Coupon.findOne({ allowedUsers: user._id, kind: "welcome" }).lean(),
    Order.countDocuments({ user: user._id }),
  ]);
  const recent = plain(orders);
  const available = welcome && welcome.isActive && welcome.usedCount < (welcome.maxUses ?? 1);

  return (
    <div className="space-y-8">
      <h1 className="h-display text-3xl">Bonjour {user.name.split(" ")[0]} 👋</h1>
      {available && (
        <div className="rounded-2xl bg-ink p-6 text-sand-50 sm:p-8">
          <Gift className="text-brass-light" />
          <p className="mt-3 text-lg">Bienvenue ! Voici votre code de réduction de {welcome!.value}{welcome!.type === "percentage" ? "%" : " DT"} :</p>
          <p className="mt-2 inline-block rounded-xl border border-dashed border-brass-light px-5 py-2 font-mono text-2xl tracking-widest text-brass-light">{welcome!.code}</p>
          <p className="mt-3 text-sm text-sand-300/70">Utilisable une seule fois, à l’étape « Récapitulatif » du paiement.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-6"><p className="label">Commandes</p><p className="h-display text-4xl">{count}</p></div>
        <div className="card p-6"><p className="label">Code de bienvenue</p><p className="h-display text-xl">{available ? "Disponible" : welcome ? "Utilisé" : "—"}</p></div>
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="h-display text-xl">Dernières commandes</h2><Link href="/account/orders" className="text-sm underline underline-offset-4">Tout voir</Link></div>
        {recent.length === 0 ? <p className="text-sm text-ink/60">Aucune commande pour le moment.</p> : (
          <ul className="card divide-y divide-ink/10">
            {recent.map((o) => (
              <li key={o._id as unknown as string}><Link href={`/account/orders/${o._id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-sand-50">
                <div><p className="font-mono text-sm font-medium">{o.orderNumber}</p><p className="text-xs text-ink/60">{formatDate(o.createdAt)}</p></div>
                <div className="flex items-center gap-4"><StatusBadge status={o.status} /><span className="text-sm font-semibold">{formatPrice(o.total)}</span></div>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
      <ExchangeRequests />
    </div>
  );
}
