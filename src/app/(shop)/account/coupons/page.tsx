import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { formatDate, plain } from "@/lib/utils";
import { Coupon } from "@/models/Coupon";

export const metadata = { title: "Mes coupons", robots: { index: false } };

export default async function CouponsPage() {
  const user = await requireUser();
  await connectDB();
  const coupons = plain(await Coupon.find({ allowedUsers: user._id }).sort({ createdAt: -1 }).lean());
  return (
    <div>
      <h1 className="h-display mb-6 text-3xl">Mes coupons</h1>
      {coupons.length === 0 ? <p className="text-ink/55">Aucun coupon pour le moment.</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {coupons.map((c) => {
            const usable = c.isActive && (c.maxUses == null || c.usedCount < c.maxUses) && (!c.expiresAt || new Date(c.expiresAt) > new Date());
            return (
              <div key={String(c._id)} className={`card p-5 ${usable ? "" : "opacity-60"}`}>
                <p className="font-mono text-xl font-semibold tracking-widest">{c.code}</p>
                <p className="mt-1 text-sm">{c.type === "percentage" ? `-${c.value}%` : `-${c.value} DT`} sur votre commande</p>
                <p className="mt-2 text-xs text-ink/50">{usable ? "Disponible · usage unique" : "Utilisé ou expiré"}{c.expiresAt && ` · expire le ${formatDate(c.expiresAt)}`}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
