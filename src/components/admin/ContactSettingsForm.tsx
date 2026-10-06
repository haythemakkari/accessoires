"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";

const KEYS = ["contactPhone", "contactHours", "contactEmail", "contactEmailNote", "contactAddress", "contactAddressNote"] as const;
type C = Record<(typeof KEYS)[number], string>;
const pick = (s: C): C => Object.fromEntries(KEYS.map((k) => [k, s[k] ?? ""])) as C;

export function ContactSettingsForm() {
  const [v, setV] = useState<C | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetcher<C>("/api/admin/settings").then((s) => setV(pick(s))).catch((e) => toast.error(e.message)); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return;
    setBusy(true);
    try {
      setV(pick(await fetcher<C>("/api/admin/settings/contact", { method: "PUT", body: v })));
      toast.success("Coordonnées enregistrées");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const input = (k: keyof C, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="a-label">{label}</label><input className="a-input" value={v![k]} onChange={(e) => setV({ ...v!, [k]: e.target.value })} {...props} /></div>
  );

  return (
    <form onSubmit={save} className="a-card max-w-lg space-y-4 p-5">
      <h2 className="font-medium text-slate-900">Coordonnées (page Contact)</h2>
      {!v ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          <fieldset className="space-y-3"><legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Téléphone</legend>
            {input("contactPhone", "Numéro", { type: "tel", placeholder: "20 123 456" })}
            {input("contactHours", "Précision affichée dessous", { placeholder: "Tous les jours, 9h – 20h" })}
          </fieldset>
          <fieldset className="space-y-3"><legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</legend>
            {input("contactEmail", "Adresse email", { type: "email" })}
            {input("contactEmailNote", "Précision affichée dessous", { placeholder: "Réponse sous 24h" })}
          </fieldset>
          <fieldset className="space-y-3"><legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Adresse</legend>
            {input("contactAddress", "Adresse", { placeholder: "12 rue … , Tunis" })}
            {input("contactAddressNote", "Précision affichée dessous", { placeholder: "Boutique ouverte du lundi au samedi" })}
          </fieldset>
          <p className="text-xs text-slate-500">Seules les cartes dont le champ principal est rempli s’affichent sur la page Contact.</p>
          <button className="a-btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </>
      )}
    </form>
  );
}
