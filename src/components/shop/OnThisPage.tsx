"use client";
import { useEffect, useState } from "react";

/** Sommaire collant « Sur cette page » : la rubrique visible est mise en évidence pendant le défilement. */
export function OnThisPage({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="Sur cette page" className="sticky top-32 hidden self-start lg:block">
      <p className="eyebrow !text-ink/60">Sur cette page</p>
      <ul className="mt-4 border-l border-ink/10">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "true" : undefined}
              className={`-ml-px block border-l-2 px-4 py-2.5 text-sm transition ${active === i.id ? "border-brass bg-sand-100 font-semibold text-ink" : "border-transparent text-ink/70 hover:text-ink"}`}>{i.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
