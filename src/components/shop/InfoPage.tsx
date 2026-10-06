import Link from "next/link";
import { SERVICE_LINKS } from "@/lib/navigation";

export function InfoPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-8 py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <aside>
        <p className="eyebrow">Service client</p>
        <nav className="mt-4 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Service client">
          {SERVICE_LINKS.map((l) => <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm hover:bg-sand-100">{l.label}</Link>)}
        </nav>
      </aside>
      <article className="max-w-2xl">
        <h1 className="h-display text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-ink/65">{intro}</p>}
        <div className="mt-8 space-y-6 leading-relaxed text-ink/80">{children}</div>
      </article>
    </div>
  );
}
