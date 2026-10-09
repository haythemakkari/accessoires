"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { CategoryDTO } from "@/lib/data";

const SORTS = [
  { v: "newest", l: "Nouveautés" },
  { v: "popular", l: "Popularité" },
  { v: "price_asc", l: "Prix croissant" },
  { v: "price_desc", l: "Prix décroissant" },
];
const GENDERS = [
  { v: "", l: "Tous" },
  { v: "homme", l: "Homme" },
  { v: "femme", l: "Femme" },
  { v: "unisex", l: "Unisex" },
];

function useFilterState() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [min, setMin] = useState(sp.get("minPrice") ?? "");
  const [max, setMax] = useState(sp.get("maxPrice") ?? "");
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    next.delete("page");
    start(() => router.replace(`${path}?${next.toString()}`, { scroll: false }));
  };

  return { sp, path, router, pending, update, q, setQ, min, setMin, max, setMax, start };
}

export function FilterPanel({ categories }: { categories: CategoryDTO[] }) {
  const { sp, path, router, update, q, setQ, min, setMin, max, setMax, start } = useFilterState();
  const cat = sp.get("category") ?? "";
  const gender = sp.get("gender") ?? "";
  const hasFilters = [...sp.keys()].some((k) => k !== "page" && k !== "sort");
  const urlQ = sp.get("q") ?? "";
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Recherche « live » avec debounce
  useEffect(() => {
    if (q.trim() === urlQ) return;
    timer.current = setTimeout(() => update({ q: q.trim() }), 350);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  // Resynchronise le champ si l'URL change ailleurs (ex. recherche du header)
  useEffect(() => {
    if (document.activeElement?.tagName !== "INPUT") setQ(urlQ); // ne pas écraser une saisie en cours
  }, [urlQ, setQ]);

  return (
    <div className="space-y-7">
      <>
      <div>
        <label className="label">Recherche</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du produit…" className="input" />
      </div>
      <div>
        <p className="label">Catégorie</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!cat} onClick={() => update({ category: "" })}>Toutes</Chip>
          {categories.map((c) => <Chip key={c._id} active={cat === c.slug} onClick={() => update({ category: c.slug })}>{c.name}</Chip>)}
        </div>
      </div>
      <div>
        <p className="label">Pour</p>
        <div className="flex flex-wrap gap-2">{GENDERS.map((g) => <Chip key={g.v} active={gender === g.v} onClick={() => update({ gender: g.v })}>{g.l}</Chip>)}</div>
      </div>
      </>
      <div>
        <p className="label">Prix (DT)</p>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ minPrice: min })} placeholder="Min" className="input" />
          <span className="text-ink/60">–</span>
          <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ maxPrice: max })} placeholder="Max" className="input" />
        </div>
      </div>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={sp.get("inStock") === "true"} onChange={(e) => update({ inStock: e.target.checked ? "true" : "" })} className="h-5 w-5 accent-brass" />
          En stock uniquement
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={sp.get("onSale") === "true"} onChange={(e) => update({ onSale: e.target.checked ? "true" : "" })} className="h-5 w-5 accent-brass" />
          En promotion
        </label>
      </div>
      {hasFilters && (
        <button onClick={() => { setQ(""); setMin(""); setMax(""); start(() => router.replace(path)); }} className="text-sm text-clay underline underline-offset-4">Réinitialiser</button>
      )}
    </div>
  );
}

export function FilterSidebar({ categories }: { categories: CategoryDTO[] }) {
  return <aside className="hidden w-64 shrink-0 lg:block"><FilterPanel categories={categories} /></aside>;
}

export function ShopToolbar({ categories, total }: { categories: CategoryDTO[]; total: number }) {
  const { sp, update, pending } = useFilterState();
  const [open, setOpen] = useState(false);
  const cat = sp.get("category") ?? "";
  const gender = sp.get("gender") ?? "";
  const all = !cat && !gender;
  // Téléphone : un clic sur la pastille active la retire (retour à « Tout voir »)
  const pills = [
    { key: "all", label: "Tout voir", active: all, go: () => update({ category: "", gender: "" }) },
    ...["femme", "homme"].map((g) => ({ key: g, label: g === "femme" ? "Femme" : "Homme", active: gender === g, go: () => update({ gender: gender === g ? "" : g }) })),
    ...categories.map((c) => ({ key: c._id, label: c.name, active: cat === c.slug, go: () => update({ category: cat === c.slug ? "" : c.slug }) })),
  ];
  return (
    <>
      <div className="mb-5 space-y-3 lg:hidden">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
          {pills.map((p) => (
            <button key={p.key} onClick={p.go} aria-pressed={p.active} className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition ${p.active ? "bg-ink text-sand-50" : "bg-white text-ink/70"}`}>{p.label}</button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-3 rounded-2xl border border-ink/15 bg-white px-5 py-3 text-sm font-semibold"><SlidersHorizontal size={16} /> Filtrer et trier <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} /></button>
          <span className={`text-sm font-semibold text-ink/60 transition ${pending ? "opacity-50" : ""}`}>{total} produit{total > 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="mb-6 hidden items-center justify-end gap-3 lg:flex">
        <span className={`text-xs text-ink/60 transition ${pending ? "opacity-100" : "opacity-0"}`}>Mise à jour…</span>
        <select value={sp.get("sort") ?? "newest"} onChange={(e) => update({ sort: e.target.value })} className="input !w-auto !py-2" aria-label="Trier par">
          {SORTS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
        </select>
      </div>
      {open && <FilterSheet total={total} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Téléphone : feuille qui monte du bas de l'écran (Filtrer : promo, stock, prix, tri). Les filtres s'appliquent en direct, le bouton ferme la feuille. */
function FilterSheet({ total, onClose }: { total: number; onClose: () => void }) {
  const { sp, router, path, update, min, setMin, max, setMax, start } = useFilterState();
  const [section, setSection] = useState<"prix" | "tri" | null>(null);
  const hasFilters = [...sp.keys()].some((k) => k !== "page");
  const sort = sp.get("sort") ?? "newest";

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose]);

  const reset = () => { setMin(""); setMax(""); start(() => router.replace(path, { scroll: false })); };
  const toggle = (key: "onSale" | "inStock") => update({ [key]: sp.get(key) === "true" ? "" : "true" });
  const priceHint = min || max ? `${min || "0"} – ${max || "∞"} DT` : "";

  const Row = ({ label, on, onClick, accent }: { label: string; on: boolean; onClick: () => void; accent?: boolean }) => (
    <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
      <span className={`font-semibold ${accent ? "text-clay" : ""}`}>{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-7 w-12 rounded-full transition ${on ? "bg-ink" : "bg-ink/20"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
  const Head = ({ id, label, hint }: { id: "prix" | "tri"; label: string; hint?: string }) => (
    <button type="button" aria-expanded={section === id} onClick={() => setSection(section === id ? null : id)} className="flex w-full items-center justify-between px-5 py-4 text-left">
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-2 text-sm text-ink/60">{hint}<ChevronDown size={16} className={`transition ${section === id ? "rotate-180" : ""}`} /></span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtrer">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/20" />
        <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-3.5">
          <h2 className="text-xl font-semibold">Filtrer</h2>
          <div className="flex items-center gap-4">
            <button type="button" onClick={reset} disabled={!hasFilters} className="text-sm font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-40">Tout effacer</button>
            <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-100"><X size={18} /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Row label="En promotion" accent on={sp.get("onSale") === "true"} onClick={() => toggle("onSale")} />
          <Row label="En stock uniquement" on={sp.get("inStock") === "true"} onClick={() => toggle("inStock")} />
          <div className="border-b border-ink/10">
            <Head id="prix" label="Prix (DT)" hint={priceHint} />
            {section === "prix" && (
              <div className="flex items-center gap-2 px-5 pb-4">
                <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ minPrice: min })} placeholder="Min" aria-label="Prix minimum" className="input" />
                <span className="text-ink/60">–</span>
                <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ maxPrice: max })} placeholder="Max" aria-label="Prix maximum" className="input" />
              </div>
            )}
          </div>
          <div className="border-b border-ink/10">
            <Head id="tri" label="Trier par" hint={SORTS.find((x) => x.v === sort)?.l} />
            {section === "tri" && (
              <ul className="px-5 pb-3">
                {SORTS.map((x) => (
                  <li key={x.v}>
                    <button type="button" onClick={() => update({ sort: x.v })} className="flex w-full items-center gap-3 py-2.5 text-left text-sm">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${sort === x.v ? "border-ink" : "border-ink/30"}`}>{sort === x.v && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}</span>
                      {x.l}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 border-t border-ink/10 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => { update({ minPrice: min, maxPrice: max }); onClose(); }} className="btn-primary flex-1 !py-3.5 !text-base">Voir {total} produit{total > 1 ? "s" : ""}</button>
          <button type="button" onClick={reset} disabled={!hasFilters} className="text-sm font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-40">Réinitialiser</button>
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${active ? "border-ink bg-ink text-sand-50" : "border-ink/15 hover:border-ink/50"}`}>
      {children}
    </button>
  );
}
