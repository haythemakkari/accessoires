"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { MAX_CONTACT_PHONES } from "@/lib/contact-phones";

const KEYS = ["contactHours", "contactEmail", "contactEmailNote", "contactAddress", "contactAddressNote"] as const;
type C = Record<(typeof KEYS)[number], string>;
const pick = (s: C): C => Object.fromEntries(KEYS.map((k) => [k, s[k] ?? ""])) as C;
type Api = C & { contactPhones: string[]; whatsappPhone: string };
/** Numéros en cours de saisie + index du numéro WhatsApp (null = aucun). */
type Phones = { list: string[]; wa: number | null };
const toPhones = (s: Api): Phones => { const list = s.contactPhones?.length ? s.contactPhones : [""]; const i = list.indexOf(s.whatsappPhone); return { list, wa: s.whatsappPhone && i >= 0 ? i : null }; };

export function ContactSettingsForm() {
  const [v, setV] = useState<C | null>(null);
  const [ph, setPh] = useState<Phones>({ list: [""], wa: null });
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetcher<Api>("/api/admin/settings").then((s) => { setV(pick(s)); setPh(toPhones(s)); }).catch((e) => toast.error(e.message)); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return;
    setBusy(true);
    try {
      // Les cases vides sont ignorées ; le numéro WhatsApp est désigné par sa position dans la liste.
      const kept = ph.list.map((p, i) => ({ p: p.trim(), i })).filter((x) => x.p);
      const waNumber = ph.wa != null ? ph.list[ph.wa]?.trim() ?? "" : "";
      const saved = await fetcher<Api>("/api/admin/settings/contact", { method: "PUT", body: { ...v, contactPhones: kept.map((x) => x.p), whatsappPhone: kept.some((x) => x.p === waNumber) ? waNumber : "" } });
      setV(pick(saved));
      setPh(toPhones(saved));
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
            <p className="text-xs text-slate-500">Ajoutez un ou plusieurs numéros (le premier est le numéro principal). Cochez « WhatsApp » sur celui qui reçoit les messages WhatsApp.</p>
            <ul className="space-y-2">
              {ph.list.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input className="a-input min-w-0 flex-1" type="tel" inputMode="tel" placeholder="20 123 456" aria-label={`Numéro ${i + 1}`} value={p} onChange={(e) => setPh((x) => ({ ...x, list: x.list.map((y, k) => (k === i ? e.target.value : y)) }))} />
                  <label className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium ${ph.wa === i ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                    <input type="radio" name="whatsapp" className="accent-emerald-600" checked={ph.wa === i} onChange={() => setPh((x) => ({ ...x, wa: i }))} aria-label={`Numéro ${i + 1} : WhatsApp`} /> <MessageCircle size={14} /> WhatsApp
                  </label>
                  <button type="button" onClick={() => setPh((x) => ({ list: x.list.length > 1 ? x.list.filter((_, k) => k !== i) : [""], wa: x.wa === i ? null : x.wa != null && x.wa > i ? x.wa - 1 : x.wa }))} className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Supprimer le numéro ${i + 1}`}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="a-btn-ghost" disabled={ph.list.length >= MAX_CONTACT_PHONES} onClick={() => setPh((x) => ({ ...x, list: [...x.list, ""] }))}><Plus size={15} /> Ajouter un numéro</button>
              {ph.wa != null && <button type="button" className="text-xs text-slate-500 underline underline-offset-2" onClick={() => setPh((x) => ({ ...x, wa: null }))}>Aucun numéro WhatsApp</button>}
              <span className="text-xs text-slate-400">{ph.list.filter((p) => p.trim()).length}/{MAX_CONTACT_PHONES}</span>
            </div>
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
