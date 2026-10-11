"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCcw, RotateCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatDate } from "@/lib/utils";
import { formatTunisianPhone } from "@/lib/phone";
import { ConfirmDialog, PageHeader, Pager } from "./ui";

type Reply = { from: "admin" | "customer"; text: string; createdAt: string };
type X = {
  _id: string; name: string; phone?: string; email?: string; subject: string; message: string; orderNumber?: string; order?: string; user?: string;
  status: "open" | "answered" | "closed"; isRead: boolean; replies: Reply[]; createdAt: string;
};
type Res = { items: X[]; total: number; unread: number; open: number; page: number; pages: number };

const STATUS = {
  open: { label: "À traiter", cls: "bg-amber-100 text-amber-800" },
  answered: { label: "Répondue", cls: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Clôturée", cls: "bg-slate-200 text-slate-700" },
} as const;
const TABS = [["", "Toutes"], ["open", "À traiter"], ["answered", "Répondues"], ["closed", "Clôturées"]] as const;

export function ExchangesInbox() {
  const [data, setData] = useState<Res | null>(null);
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<X | null>(null);

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page) });
    if (status) sp.set("status", status);
    try { setData(await fetcher<Res>(`/api/admin/exchanges?${sp}`)); } catch (e) { toast.error((e as Error).message); }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  const patch = async (id: string, body: { status?: string; isRead?: boolean }) => {
    try { await fetcher(`/api/admin/exchanges/${id}`, { method: "PATCH", body }); await load(); } catch (e) { toast.error((e as Error).message); }
  };
  const toggle = (x: X) => { setOpen(open === x._id ? null : x._id); if (!x.isRead) patch(x._id, { isRead: true }); };

  const reply = async (x: X) => {
    const text = (draft[x._id] ?? "").trim();
    if (text.length < 2) return toast.error("Écrivez votre réponse");
    setBusy(x._id);
    try {
      await fetcher(`/api/admin/exchanges/${x._id}/reply`, { method: "POST", body: { text } });
      setDraft((d) => ({ ...d, [x._id]: "" }));
      toast.success(x.user ? "Réponse envoyée : le client la voit dans son compte" : "Réponse enregistrée (ce client n’a pas de compte : contactez-le par téléphone ou email)");
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await fetcher(`/api/admin/exchanges/${toDelete._id}`, { method: "DELETE" });
      toast.success("Demande supprimée");
      setToDelete(null);
      if (data && data.items.length === 1 && page > 1) setPage(page - 1); else await load();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <PageHeader title={`Demandes d’échange${data?.open ? ` (${data.open} à traiter)` : ""}`}>
        <div className="flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`rounded-md px-3 py-1.5 ${status === k ? "bg-indigo-600 text-white" : "text-slate-600"}`}>{l}</button>)}
        </div>
      </PageHeader>

      <div className="a-card overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {data?.items.map((x) => {
            const st = STATUS[x.status];
            return (
              <li key={x._id}>
                <div className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${x.isRead ? "" : "bg-indigo-50/40"}`}>
                  <button onClick={() => toggle(x)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-expanded={open === x._id}>
                    <RefreshCcw size={18} className={`mt-0.5 shrink-0 ${x.isRead ? "text-slate-400" : "text-indigo-600"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className={`truncate text-sm ${x.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}><span className="font-mono">{x.orderNumber}</span> · {x.name}</p>
                        <span className="flex items-center gap-2 text-xs text-slate-400">{formatDate(x.createdAt)}<span className={`rounded-full px-2 py-0.5 font-medium ${st.cls}`}>{st.label}</span></span>
                      </div>
                      {open !== x._id && <p className="truncate text-sm text-slate-500">{x.replies.length > 0 ? `↳ ${x.replies[x.replies.length - 1].text}` : x.message}</p>}
                    </div>
                  </button>
                  <button onClick={() => setToDelete(x)} className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Supprimer la demande de ${x.name}`} title="Supprimer"><Trash2 size={16} /></button>
                </div>
                {open === x._id && (
                  <div className="space-y-4 border-t border-slate-100 bg-white px-4 py-4 pl-11 text-sm">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
                      {x.phone && <span>📞 <a href={`tel:${x.phone}`} className="underline">{formatTunisianPhone(x.phone)}</a></span>}
                      {x.email && <span>✉️ <a href={`mailto:${x.email}`} className="underline">{x.email}</a></span>}
                      {x.order && <Link href={`/admin/orders/${x.order}`} className="text-indigo-600 underline">Voir la commande {x.orderNumber}</Link>}
                      <span className={x.user ? "text-emerald-700" : "text-slate-400"}>{x.user ? "Client avec compte : voit vos réponses dans « Mon compte »" : "Sans compte : contactez-le par téléphone ou email"}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-100 p-3"><p className="mb-1 text-xs font-medium text-slate-500">{x.name} · {formatDate(x.createdAt)}</p><p className="whitespace-pre-wrap text-slate-800">{x.message}</p></div>
                      {x.replies.map((r, i) => (
                        <div key={i} className={`max-w-[90%] rounded-2xl p-3 ${r.from === "admin" ? "ml-auto rounded-tr-sm bg-indigo-600 text-white" : "rounded-tl-sm bg-slate-100"}`}>
                          <p className={`mb-1 text-xs font-medium ${r.from === "admin" ? "text-indigo-200" : "text-slate-500"}`}>{r.from === "admin" ? "Vous" : x.name} · {formatDate(r.createdAt)}</p>
                          <p className="whitespace-pre-wrap">{r.text}</p>
                        </div>
                      ))}
                    </div>

                    {x.status !== "closed" && (
                      <div>
                        <label className="a-label" htmlFor={`r-${x._id}`}>Répondre au client</label>
                        <textarea id={`r-${x._id}`} className="a-input" rows={3} maxLength={2000} placeholder="Ex. Bonjour, nous acceptons l’échange : merci de nous renvoyer l’article à l’adresse suivante…" value={draft[x._id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [x._id]: e.target.value }))} />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button className="a-btn-primary" disabled={busy === x._id} onClick={() => reply(x)}><Send size={15} /> {busy === x._id ? "Envoi…" : "Envoyer la réponse"}</button>
                          <button className="a-btn-ghost" onClick={() => patch(x._id, { status: "closed" })}><CheckCircle2 size={15} /> Clôturer la demande</button>
                        </div>
                      </div>
                    )}
                    {x.status === "closed" && <button className="a-btn-ghost" onClick={() => patch(x._id, { status: x.replies.length ? "answered" : "open" })}><RotateCcw size={15} /> Rouvrir la demande</button>}
                  </div>
                )}
              </li>
            );
          })}
          {data?.items.length === 0 && <li className="px-4 py-10 text-center text-slate-400">Aucune demande d’échange</li>}
          {!data && <li className="px-4 py-10 text-center text-slate-400">Chargement…</li>}
        </ul>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>

      <ConfirmDialog open={!!toDelete} title="Supprimer la demande" message={`Supprimer définitivement la demande de ${toDelete?.name} (commande ${toDelete?.orderNumber}) et ses réponses ? Cette action est irréversible.`} onClose={() => setToDelete(null)} onConfirm={confirmDelete} />
    </>
  );
}
