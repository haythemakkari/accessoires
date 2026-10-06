"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
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
      <div>
        <p className="label">Prix (DT)</p>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ minPrice: min })} placeholder="Min" className="input" />
          <span className="text-ink/40">–</span>
          <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} onBlur={() => update({ maxPrice: max })} placeholder="Max" className="input" />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={sp.get("inStock") === "true"} onChange={(e) => update({ inStock: e.target.checked ? "true" : "" })} className="h-4 w-4 accent-brass" />
        En stock uniquement
      </label>
      {hasFilters && (
        <button onClick={() => { setQ(""); setMin(""); setMax(""); start(() => router.replace(path)); }} className="text-sm text-clay underline underline-offset-4">Réinitialiser</button>
      )}
    </div>
  );
}

export function FilterSidebar({ categories }: { categories: CategoryDTO[] }) {
  return <aside className="hidden w-64 shrink-0 lg:block"><FilterPanel categories={categories} /></aside>;
}

export function ShopToolbar({ categories }: { categories: CategoryDTO[] }) {
  const { sp, update, pending } = useFilterState();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button onClick={() => setOpen(true)} className="btn-outline !px-4 !py-2 lg:hidden"><SlidersHorizontal size={16} /> Filtres</button>
        <span className={`hidden text-xs text-ink/40 transition sm:block ${pending ? "opacity-100" : "opacity-0"}`}>Mise à jour…</span>
        <select value={sp.get("sort") ?? "newest"} onChange={(e) => update({ sort: e.target.value })} className="input !w-auto !py-2" aria-label="Trier par">
          {SORTS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
        </select>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-sand-50 p-6">
            <button onClick={() => setOpen(false)} className="mb-4 ml-auto block" aria-label="Fermer"><X /></button>
            <FilterPanel categories={categories} />
            <button onClick={() => setOpen(false)} className="btn-primary mt-8 w-full">Voir les résultats</button>
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
