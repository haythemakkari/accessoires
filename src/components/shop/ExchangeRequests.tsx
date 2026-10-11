"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatDate } from "@/lib/utils";
import type { CustomerExchange } from "@/lib/exchange-dto";

export const EXCHANGE_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
  answered: { label: "Répondue", cls: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Clôturée", cls: "bg-slate-200 text-slate-700" },
};

/** « Mes demandes d'échange » du tableau de bord : état de chaque demande et réponses de l'équipe. */
export function ExchangeRequests() {
  const [items, setItems] = useState<CustomerExchange[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const load = useCallback(() => fetcher<{ items: CustomerExchange[] }>("/api/account/exchanges").then((r) => setItems(r.items)).catch(() => setItems([])), []);
  useEffect(() => { load(); }, [load]);

  const toggle = (x: CustomerExchange) => {
    const next = open === x.id ? null : x.id;
    setOpen(next);
    if (next && x.unread) {
      // Les nouvelles réponses sont vues : le signalement disparaît.
      fetcher(`/api/account/exchanges/${x.id}`, { method: "PATCH" }).then(() => setItems((l) => l?.map((i) => (i.id === x.id ? { ...i, unread: false } : i)) ?? l)).catch(() => {});
    }
  };

  const send = async (x: CustomerExchange) => {
    const text = (draft[x.id] ?? "").trim();
    if (text.length < 2) return toast.error("Écrivez votre message");
    setSending(x.id);
    try {
      await fetcher(`/api/account/exchanges/${x.id}/reply`, { method: "POST", body: { text } });
      setDraft((d) => ({ ...d, [x.id]: "" }));
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setSending(null); }
  };

  const unread = items?.filter((i) => i.unread).length ?? 0;
  return (
    <section aria-labelledby="exchanges-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="exchanges-title" className="h-display flex items-center gap-2 text-xl">Mes demandes d’échange {unread > 0 && <span className="rounded-full bg-clay px-2.5 py-0.5 text-xs font-semibold text-white">{unread} nouvelle{unread > 1 ? "s" : ""} réponse{unread > 1 ? "s" : ""}</span>}</h2>
        <Link href="/service-client/demande-echange" className="text-sm underline underline-offset-4">Nouvelle demande</Link>
      </div>
      {items === null ? <p className="text-sm text-ink/60">Chargement…</p> : items.length === 0 ? (
        <p className="card flex items-center gap-3 p-4 text-sm text-ink/65"><RefreshCcw size={18} className="shrink-0 text-brass-dark" /> Aucune demande d’échange. Un article ne vous convient pas ? <Link href="/service-client/retours-echanges" className="underline underline-offset-4">Voir comment faire</Link>.</p>
      ) : (
        <ul className="card divide-y divide-ink/10">
          {items.map((x) => {
            const st = EXCHANGE_STATUS[x.status] ?? EXCHANGE_STATUS.open;
            return (
              <li key={x.id}>
                <button type="button" onClick={() => toggle(x)} aria-expanded={open === x.id} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-sand-50">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium"><span className="font-mono">{x.orderNumber}</span>{x.unread && <span className="h-2 w-2 rounded-full bg-clay" aria-label="Nouvelle réponse" />}</p>
                    <p className="text-xs text-ink/60">{formatDate(x.createdAt as string)} · {x.replies.length} message{x.replies.length > 1 ? "s" : ""} échangé{x.replies.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span><ChevronDown size={16} className={`text-ink/50 transition ${open === x.id ? "rotate-180" : ""}`} /></div>
                </button>
                {open === x.id && (
                  <div className="space-y-3 border-t border-ink/10 bg-sand-50/60 px-4 py-4 text-sm">
                    <div className="rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">
                      <p className="mb-1 text-xs font-medium text-ink/55">Votre demande · {formatDate(x.createdAt as string)}</p>
                      <p className="whitespace-pre-wrap text-ink/85">{x.message}</p>
                    </div>
                    {x.replies.length === 0 && <p className="text-xs text-ink/60">Nous étudions votre demande et vous répondons ici dès que possible.</p>}
                    {x.replies.map((r, i) => (
                      <div key={i} className={`max-w-[92%] rounded-2xl p-3 shadow-sm ${r.from === "admin" ? "ml-auto rounded-tr-sm bg-ink text-sand-50" : "rounded-tl-sm bg-white"}`}>
                        <p className={`mb-1 text-xs font-medium ${r.from === "admin" ? "text-brass-light" : "text-ink/55"}`}>{r.from === "admin" ? "Accessoires Plus" : "Vous"} · {formatDate(r.createdAt as string)}</p>
                        <p className="whitespace-pre-wrap">{r.text}</p>
                      </div>
                    ))}
                    {x.status !== "closed" ? (
                      <div>
                        <label className="label" htmlFor={`rep-${x.id}`}>Votre message</label>
                        <textarea id={`rep-${x.id}`} rows={3} maxLength={2000} className="input" placeholder="Répondre à l’équipe…" value={draft[x.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [x.id]: e.target.value }))} />
                        <button type="button" onClick={() => send(x)} disabled={sending === x.id} className="btn-primary mt-2 !py-2.5"><Send size={15} /> {sending === x.id ? "Envoi…" : "Envoyer"}</button>
                      </div>
                    ) : <p className="rounded-xl bg-white px-3 py-2 text-xs text-ink/60">Cette demande est clôturée. Besoin d’un autre échange ? <Link href="/service-client/demande-echange" className="underline underline-offset-4">Faire une nouvelle demande</Link>.</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
