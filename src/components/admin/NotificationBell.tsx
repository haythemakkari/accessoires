"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, PackageX } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { mediaUrl } from "@/lib/media";

type Item = { id: string; name: string; sku: string; stock: number; image: string | null };
type Data = { threshold: number; count: number; lowStock: Item[] };

const POLL_MS = 60_000;
/** À émettre (window.dispatchEvent) après toute modification de stock pour rafraîchir la cloche immédiatement. */
export const STOCK_CHANGED_EVENT = "admin:stock-changed";

export function NotificationBell() {
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const known = useRef<Set<string> | null>(null); // produits déjà signalés ; null = premier chargement (pas de toast)
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetcher<Data>("/api/admin/notifications");
      if (known.current) {
        // Nouveau produit passé sous le seuil depuis le dernier relevé → petit toast d'information.
        const fresh = d.lowStock.filter((p) => !known.current!.has(p.id));
        for (const p of fresh.slice(0, 3)) {
          (p.stock === 0 ? toast.error : toast.warning)(p.stock === 0 ? `Rupture de stock : ${p.name}` : `Stock bas : ${p.name} (${p.stock} restant${p.stock > 1 ? "s" : ""})`);
        }
      }
      known.current = new Set(d.lowStock.map((p) => p.id));
      setData(d);
    } catch {
      /* silencieux : la cloche réessaiera au prochain cycle */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener(STOCK_CHANGED_EVENT, onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); window.removeEventListener(STOCK_CHANGED_EVENT, onFocus); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const count = data?.count ?? 0;
  const hasOut = data?.lowStock.some((p) => p.stock === 0) ?? false;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(!open); if (!open) load(); }} aria-label={count ? `${count} notification${count > 1 ? "s" : ""}` : "Notifications"} aria-expanded={open} aria-haspopup="true"
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100">
        <Bell size={20} />
        {count > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white ${hasOut ? "bg-rose-600" : "bg-amber-500"}`}>{count > 99 ? "99+" : count}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Alertes de stock</p>
            {data && <span className="text-xs text-slate-500">stock &lt; {data.threshold}</span>}
          </div>
          {!data ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Chargement…</p>
          ) : data.lowStock.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-slate-500"><CheckCircle2 className="text-emerald-500" size={28} />Aucune alerte : tous les stocks sont suffisants.</div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {data.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {p.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(p.image, 160)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="truncate text-xs text-slate-400">{p.sku}</p>
                    </div>
                    {p.stock === 0 ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700"><PackageX size={13} /> Rupture</span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"><AlertTriangle size={13} /> {p.stock} restant{p.stock > 1 ? "s" : ""}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data && data.count > data.lowStock.length && <p className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500">et {data.count - data.lowStock.length} autre(s) produit(s)…</p>}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center"><Link href="/admin/products" onClick={() => setOpen(false)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Gérer les produits</Link></div>
        </div>
      )}
    </div>
  );
}
