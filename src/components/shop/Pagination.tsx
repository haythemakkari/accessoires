import Link from "next/link";

export function Pagination({ page, pages, params }: { page: number; pages: number; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && <Link href={href(page - 1)} className="btn-outline !px-4 !py-2">Précédent</Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-ink/60">…</span>}
          <Link href={href(n)} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${n === page ? "bg-ink text-sand-50" : "hover:bg-sand-100"}`}>{n}</Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className="btn-outline !px-4 !py-2">Suivant</Link>}
    </nav>
  );
}
