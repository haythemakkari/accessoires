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

export function FilterPanel({ categories, withSort = false, compact = false }: { categories: CategoryDTO[]; withSort?: boolean; compact?: boolean }) {
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
      {withSort && (
        <div>
          <label className="label" htmlFor="tri-mobile">Trier par</label>
          <select id="tri-mobile" value={sp.get("sort") ?? "newest"} onChange={(e) => update({ sort: e.target.value })} className="input">
            {SORTS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
          </select>
        </div>
      )}
      {!compact && (
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
      )}
      <div>
        <p className="label">Prix (DT)</p>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ minPrice: min })} placeholder="Min" className="input" />
          <span className="text-ink/60">–</span>
          <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ maxPrice: max })} placeholder="Max" className="input" />
        </div>
      </div>
      <div className="space-y-3">
        {compact && <p className="label !mb-0">Disponibilité</p>}
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
  const { sp, update, pending, router, path, start } = useFilterState();
  const [open, setOpen] = useState(false);
  const hasFilters = [...sp.keys()].some((k) => k !== "page");
  const reset = () => start(() => router.replace(path, { scroll: false }));
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
      {open && (
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm lg:hidden">
          <FilterPanel key={hasFilters ? "f" : "n"} categories={categories} withSort compact />
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <button onClick={reset} disabled={!hasFilters} className="text-sm text-ink/60 underline underline-offset-4 disabled:no-underline disabled:opacity-40">Réinitialiser les filtres</button>
            <button onClick={() => setOpen(false)} className="btn-primary !px-6">Voir {total} produit{total > 1 ? "s" : ""}</button>
          </div>
        </div>
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${active ? "border-ink bg-ink text-sand-50" : "border-ink/15 hover:border-ink/50"}`}>
      {children}
    </button>
  );
}
