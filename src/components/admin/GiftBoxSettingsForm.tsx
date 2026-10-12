"use client";
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { Switch } from "./ui";

type S = { giftBoxEnabled: boolean; giftBoxPrice: number; giftBoxDescription: string };

export function GiftBoxSettingsForm() {
  const [enabled, setEnabled] = useState(false);
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetcher<S>("/api/admin/settings").then((s) => { setEnabled(s.giftBoxEnabled); setPrice(String(s.giftBoxPrice)); setDesc(s.giftBoxDescription); setLoaded(true); }).catch((e) => toast.error(e.message));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const n = Number(price.replace(",", "."));
      const s = await fetcher<S>("/api/admin/settings/giftbox", { method: "PUT", body: { giftBoxEnabled: enabled, giftBoxPrice: Number.isFinite(n) ? n : 0, giftBoxDescription: desc } });
      setEnabled(s.giftBoxEnabled); setPrice(String(s.giftBoxPrice)); setDesc(s.giftBoxDescription);
      toast.success(s.giftBoxEnabled ? `Box cadeau activée à ${s.giftBoxPrice} DT` : "Box cadeau désactivée");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="a-card max-w-lg space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium text-slate-900"><Gift size={16} className="text-indigo-600" /> Box cadeau</h2>
          <p className="mt-0.5 text-xs text-slate-500">Option d’emballage cadeau que le client coche à la validation de son panier. Elle s’ajoute une seule fois à la commande.</p>
        </div>
        <Switch label="Activer la box cadeau" checked={enabled} onChange={setEnabled} />
      </div>
      {!loaded ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          <div>
            <label className="a-label">Prix de la box cadeau (DT)</label>
            <input className="a-input" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="13" />
            <p className="mt-1 text-xs text-slate-500">Facturé en plus des articles. Il ne compte pas dans le montant de livraison offerte et n’est pas réduit par les codes promo. Les commandes déjà passées gardent leur prix d’origine.</p>
          </div>
          <div>
            <label className="a-label">Description <span className="font-normal text-slate-400">(affichée au client)</span></label>
            <textarea className="a-input" rows={3} maxLength={200} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Emballage luxe avec carte de vœux personnalisée" />
          </div>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{enabled ? "Activée : l’option apparaît dans le panier et à l’étape « Récapitulatif » de la commande." : "Désactivée : le client ne voit pas l’option."} Le client peut aussi écrire un court message pour la carte.</p>
          <button className="a-btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </>
      )}
    </form>
  );
}
