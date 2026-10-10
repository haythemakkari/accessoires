"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { ANNOUNCEMENTS_MAX, ANNOUNCEMENT_MAX_LENGTH } from "@/lib/announcements";
import { Switch } from "./ui";

type Item = { text: string; isActive: boolean };

export function AnnouncementsForm() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [auto, setAuto] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetcher<{ announcements: Item[]; freeShippingThreshold: number; welcomeDiscountPercent: number }>("/api/admin/settings")
      .then((s) => {
        setItems(s.announcements);
        setAuto([s.freeShippingThreshold > 0 && `Livraison offerte dès ${s.freeShippingThreshold} DT`, s.welcomeDiscountPercent > 0 && `-${s.welcomeDiscountPercent}% sur la 1ʳᵉ commande en créant un compte`].filter((m): m is string => !!m));
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const set = (i: number, patch: Partial<Item>) => setItems((l) => l!.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => setItems((l) => { const a = [...l!]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items) return;
    setBusy(true);
    try {
      const saved = await fetcher<{ announcements: Item[] }>("/api/admin/settings/announcements", { method: "PUT", body: { announcements: items } });
      setItems(saved.announcements);
      toast.success("Barre d’annonces enregistrée");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="a-card max-w-2xl space-y-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-medium text-slate-900"><Megaphone size={16} className="text-indigo-600" /> Barre d’annonces</h2>
        <p className="mt-0.5 text-xs text-slate-500">Les messages défilent en haut de toutes les pages du site. Ajoutez par exemple une promotion, un jour férié ou un délai de livraison.</p>
      </div>
      {items === null ? <p className="text-sm text-slate-500">Chargement…</p> : (
        <>
          {auto.length > 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <p className="font-medium text-slate-700">Messages automatiques (toujours affichés en premier)</p>
              <ul className="mt-1 list-disc pl-4">{auto.map((m) => <li key={m}>{m}</li>)}</ul>
              <p className="mt-1 text-slate-400">Ils suivent le seuil de livraison offerte et la réduction de bienvenue réglés plus haut.</p>
            </div>
          )}
          {items.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-500">Aucun message personnalisé.</p>}
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-lg border p-2 ${it.isActive ? "border-slate-200" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label="Monter"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" aria-label="Descendre"><ArrowDown size={14} /></button>
                </div>
                <input className="a-input min-w-0 flex-1" maxLength={ANNOUNCEMENT_MAX_LENGTH} placeholder="Ex. Soldes d’été : -20 % sur les montres" value={it.text} onChange={(e) => set(i, { text: e.target.value })} aria-label={`Message ${i + 1}`} />
                <Switch label={`Message ${i + 1} affiché`} checked={it.isActive} onChange={(v) => set(i, { isActive: v })} />
                <button type="button" onClick={() => setItems((l) => l!.filter((_, k) => k !== i))} className="p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Supprimer"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="a-btn-ghost" disabled={items.length >= ANNOUNCEMENTS_MAX} onClick={() => setItems((l) => [...l!, { text: "", isActive: true }])}><Plus size={15} /> Ajouter un message</button>
            <span className="text-xs text-slate-400">{items.length}/{ANNOUNCEMENTS_MAX} · {ANNOUNCEMENT_MAX_LENGTH} caractères maximum</span>
          </div>
          <button className="a-btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </>
      )}
    </form>
  );
}
