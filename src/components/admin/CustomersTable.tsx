"use client";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatDate, formatPrice } from "@/lib/utils";
import { PageHeader, Pager, useDebounced } from "./ui";

type Cu = { id: string; name: string; email: string; phone: string; createdAt: string; orders: number; spent: number; lastOrder: string | null };
type Res = { items: Cu[]; total: number; page: number; pages: number };

export function CustomersTable() {
  const [type, setType] = useState<"registered" | "guest">("registered");
  const [data, setData] = useState<Res | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const load = useCallback(async () => {
    const sp = new URLSearchParams({ type, page: String(page) });
    if (dq) sp.set("q", dq);
    try { setData(await fetcher<Res>(`/api/admin/customers?${sp}`)); } catch (e) { toast.error((e as Error).message); }
  }, [type, page, dq]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [type, dq]);

  return (
    <>
      <PageHeader title="Clients">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(["registered", "guest"] as const).map((k) => <button key={k} onClick={() => { setData(null); setType(k); }} className={`rounded-md px-3 py-1.5 ${type === k ? "bg-indigo-600 text-white" : "text-slate-600"}`}>{k === "registered" ? "Comptes" : "Invités"}</button>)}
        </div>
      </PageHeader>
      <div className="a-card overflow-hidden">
        <div className="border-b border-slate-200 p-3"><div className="relative max-w-sm"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className="a-input !pl-9" placeholder="Nom, email, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-2.5">Nom</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Téléphone</th><th className="px-4 py-2.5">Commandes</th><th className="px-4 py-2.5">Total dépensé</th><th className="px-4 py-2.5">{type === "guest" ? "1ère commande" : "Inscription"}</th><th className="px-4 py-2.5">Dernière commande</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-2.5 font-medium">{c.name}</td><td className="px-4 py-2.5 text-slate-600">{c.email || "—"}</td><td className="px-4 py-2.5">{c.phone || "—"}</td><td className="px-4 py-2.5">{c.orders}</td><td className="px-4 py-2.5 tabular-nums">{formatPrice(c.spent)}</td><td className="px-4 py-2.5 text-slate-500">{formatDate(c.createdAt)}</td><td className="px-4 py-2.5 text-slate-500">{c.lastOrder ? formatDate(c.lastOrder) : "—"}</td></tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Aucun client</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}
