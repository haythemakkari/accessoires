"use client";
import { useState } from "react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatPrice } from "@/lib/utils";
import { OrderTimeline } from "./OrderTimeline";
import { ProductImage } from "@/components/ui/ProductImage";
import { PHONE_ERROR, parseTunisianPhone } from "@/lib/phone";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Result = { orderNumber: string; status: string; createdAt: string; total: number; items: { name: string; quantity: number; variant?: string; packaging?: string; image?: string | null }[]; history: { status: string; at: string }[] };

export function TrackForm() {
  const [v, setV] = useState({ orderNumber: "", phone: "" });
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parseTunisianPhone(v.phone)) return toast.error(PHONE_ERROR);
    setBusy(true);
    setRes(null);
    try { setRes(await fetcher<Result>("/api/orders/track", { method: "POST", body: v })); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <div><label className="label" htmlFor="on">Numéro de commande</label><input id="on" className="input uppercase" placeholder="NM-261005-ABC123" required value={v.orderNumber} onChange={(e) => setV({ ...v, orderNumber: e.target.value })} /></div>
        <div><label className="label" htmlFor="ph">Téléphone de la commande</label><input id="ph" className="input" type="tel" inputMode="tel" placeholder="20 123 456" required value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
        <button className="btn-primary" disabled={busy}>{busy ? "Recherche…" : "Suivre ma commande"}</button>
      </form>
      {res && (
        <div className="card space-y-4 p-6 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-base font-semibold">{res.orderNumber}</p><StatusBadge status={res.status} /></div>
          <OrderTimeline status={res.status} history={res.history} createdAt={res.createdAt} />
          <ul className="divide-y divide-ink/10">{res.items.map((i, k) => <li key={k} className="flex items-center gap-3 py-2"><div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-sand-100"><ProductImage src={i.image ?? undefined} alt={i.name} sizes="48px" /></div><span className="min-w-0">{i.quantity} × {i.name}{i.variant && <span className="text-ink/60"> ({i.variant})</span>}{i.packaging && <span className="text-ink/60"> · {i.packaging}</span>}</span></li>)}</ul>
          <p className="font-medium">Total : {formatPrice(res.total)}</p>
        </div>
      )}
    </div>
  );
}
