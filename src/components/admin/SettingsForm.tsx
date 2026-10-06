"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { PageHeader } from "./ui";

export function SettingsForm() {
  const [v, setV] = useState<{ shippingFee: string; freeShippingThreshold: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetcher<{ shippingFee: number; freeShippingThreshold: number }>("/api/admin/settings")
      .then((s) => setV({ shippingFee: String(s.shippingFee), freeShippingThreshold: String(s.freeShippingThreshold) }))
      .catch((e) => toast.error(e.message));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return;
    const num = (s: string) => Number(s.replace(",", "."));
    setBusy(true);
    try {
      await fetcher("/api/admin/settings", { method: "PUT", body: { shippingFee: num(v.shippingFee), freeShippingThreshold: num(v.freeShippingThreshold) } });
      toast.success("Réglages de livraison enregistrés");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Paramètres" />
      <form onSubmit={save} className="a-card max-w-lg space-y-5 p-5">
        <h2 className="font-medium text-slate-900">Livraison</h2>
        {!v ? <p className="text-sm text-slate-500">Chargement…</p> : (
          <>
            <div>
              <label className="a-label">Frais de livraison (DT)</label>
              <input className="a-input" inputMode="decimal" required value={v.shippingFee} onChange={(e) => setV({ ...v, shippingFee: e.target.value })} />
              <p className="mt-1 text-xs text-slate-500">Montant ajouté à chaque commande. Mettez 0 pour une livraison gratuite.</p>
            </div>
            <div>
              <label className="a-label">Livraison offerte à partir de (DT)</label>
              <input className="a-input" inputMode="decimal" required value={v.freeShippingThreshold} onChange={(e) => setV({ ...v, freeShippingThreshold: e.target.value })} />
              <p className="mt-1 text-xs text-slate-500">Calculé sur le sous-total après réduction. Mettez 0 pour ne jamais offrir la livraison.</p>
            </div>
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Le changement s’applique immédiatement aux nouvelles commandes ; les commandes déjà passées gardent leurs frais d’origine.</p>
            <button className="a-btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </>
        )}
      </form>
    </>
  );
}
