"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";

export function WelcomeSettingsForm() {
  const [v, setV] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetcher<{ welcomeDiscountPercent: number }>("/api/admin/settings").then((s) => setV(String(s.welcomeDiscountPercent))).catch((e) => toast.error(e.message)); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v === null) return;
    setBusy(true);
    try {
      const saved = await fetcher<{ welcomeDiscountPercent: number }>("/api/admin/settings/welcome", { method: "PUT", body: { welcomeDiscountPercent: Number(v) } });
      setV(String(saved.welcomeDiscountPercent));
      toast.success(saved.welcomeDiscountPercent === 0 ? "Offre de bienvenue désactivée" : `Réduction de bienvenue : ${saved.welcomeDiscountPercent} %`);
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="a-card max-w-lg space-y-4 p-5">
      <h2 className="font-medium text-slate-900">Offre de bienvenue</h2>
      {v === null ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          <div>
            <label className="a-label">Réduction du code de bienvenue (%)</label>
            <input className="a-input" type="number" min={0} max={50} step={1} required value={v} onChange={(e) => setV(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Offerte à chaque nouveau compte, utilisable une seule fois. Entre 0 et 50. Mettez 0 pour désactiver l’offre.</p>
          </div>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">S’applique aux <strong>nouvelles inscriptions</strong> : les codes déjà envoyés gardent leur valeur d’origine. Les textes du site (bandeau, accueil, inscription, FAQ) se mettent à jour automatiquement.</p>
          <button className="a-btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </>
      )}
    </form>
  );
}
