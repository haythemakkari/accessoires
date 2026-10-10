"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatDate, formatPrice } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/status";
import { PHONE_ERROR, parseTunisianPhone } from "@/lib/phone";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Result = { orderNumber: string; status: string; createdAt: string; total: number; items: { name: string; quantity: number; variant?: string; packaging?: string }[]; history: { status: string; at: string }[] };

const STEPS = [
  { key: "pending", label: "Commande reçue" },
  { key: "confirmed", label: "Confirmée" },
  { key: "processing", label: "En préparation" },
  { key: "shipped", label: "Expédiée" },
  { key: "delivered", label: "Livrée" },
];
const MESSAGE: Record<string, string> = {
  pending: "Nous avons bien reçu votre commande. Nous allons vous appeler pour la confirmer.",
  confirmed: "Votre commande est confirmée.",
  processing: "Votre colis est en cours de préparation.",
  shipped: "Votre colis est en route. Le livreur vous contactera avant de passer.",
  delivered: "Votre colis a été livré. Merci pour votre commande !",
  cancelled: "Cette commande a été annulée. Contactez-nous si vous avez une question.",
};

function Progress({ status }: { status: string }) {
  if (status === "cancelled") return <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-700">{MESSAGE.cancelled}</p>;
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <div>
      <ol className="flex items-start" aria-label="Progression du colis">
        {STEPS.map((s, i) => {
          const done = i < current || status === "delivered";
          const active = i === current && status !== "delivered";
          return (
            <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span className={`absolute right-1/2 top-3.5 -z-0 h-0.5 w-full ${i <= current ? "bg-brass" : "bg-ink/15"}`} />}
              <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-brass text-white" : active ? "bg-ink text-sand-50 ring-4 ring-brass/30" : "bg-sand-200 text-ink/60"}`}>
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className={`mt-2 text-xs leading-tight sm:text-xs ${i <= current ? "font-medium text-ink" : "text-ink/60"}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 rounded-xl bg-sand-100 px-4 py-3">{MESSAGE[status]}</p>
    </div>
  );
}

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
          <Progress status={res.status} />
          <ul className="divide-y divide-ink/10">{res.items.map((i, k) => <li key={k} className="py-2">{i.quantity} × {i.name}{i.variant && <span className="text-ink/60"> ({i.variant})</span>}{i.packaging && <span className="text-ink/60"> · {i.packaging}</span>}</li>)}</ul>
          <p className="font-medium">Total : {formatPrice(res.total)}</p>
          <div><p className="label">Historique</p><ul className="space-y-1">{res.history.map((h, k) => <li key={k} className="flex justify-between"><span>{STATUS_LABEL[h.status]}</span><span className="text-ink/60">{formatDate(h.at)}</span></li>)}</ul></div>
        </div>
      )}
    </div>
  );
}
