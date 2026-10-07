"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { STOCK_CHANGED_EVENT } from "./NotificationBell";

export function StockSettingsForm() {
  const [v, setV] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetcher<{ lowStockThreshold: number }>("/api/admin/settings").then((s) => setV(String(s.lowStockThreshold))).catch((e) => toast.error(e.message)); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v === null) return;
    setBusy(true);
    try {
      const saved = await fetcher<{ lowStockThreshold: number }>("/api/admin/settings/stock", { method: "PUT", body: { lowStockThreshold: Number(v) } });
      setV(String(saved.lowStockThreshold));
      window.dispatchEvent(new Event(STOCK_CHANGED_EVENT)); // la cloche se met à jour tout de suite
      toast.success(`Alerte activée sous ${saved.lowStockThreshold} en stock`);
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="a-card max-w-lg space-y-4 p-5">
      <h2 className="font-medium text-slate-900">Alertes de stock</h2>
      {v === null ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          <div>
            <label className="a-label">Prévenir quand le stock est inférieur à</label>
            <input className="a-input" type="number" min={1} max={1000} step={1} required value={v} onChange={(e) => setV(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Les produits actifs concernés apparaissent dans la cloche de notifications (en haut à droite), avec « Rupture » à 0.</p>
          </div>
          <button className="a-btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </>
      )}
    </form>
  );
}
