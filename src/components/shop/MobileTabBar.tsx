"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Headset, Home, Store, User as UserIcon } from "lucide-react";
import { useUser } from "@/stores/user";

/** Barre de navigation fixe en bas de l'écran (téléphone et petite tablette uniquement). */
export function MobileTabBar() {
  const pathname = usePathname();
  const storeUser = useUser((s) => s.user);
  const loaded = useUser((s) => s.loaded);
  const [hint, setHint] = useState<"a" | "c" | null>(null);
  useEffect(() => { setHint((document.cookie.match(/(?:^|; )ap_hint=([ac])/)?.[1] as "a" | "c" | undefined) ?? null); }, []);
  const role = loaded ? storeUser?.role : hint ? (hint === "a" ? "admin" : "customer") : undefined;

  const tabs = [
    { href: "/", label: "Accueil", Icon: Home, active: pathname === "/" },
    { href: "/products", label: "Boutique", Icon: Store, active: pathname.startsWith("/products") || pathname === "/promotions" },
    { href: "/service-client/faq", label: "Service client", Icon: Headset, active: pathname.startsWith("/service-client") || pathname === "/contact" },
    { href: role === "admin" ? "/admin" : role ? "/account" : "/login", label: "Profil", Icon: UserIcon, active: pathname.startsWith("/account") || pathname === "/login" || pathname === "/register" },
  ];

  return (
    <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {tabs.map(({ href, label, Icon, active }) => (
          <li key={label}>
            <Link href={href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${active ? "text-brass-dark" : "text-ink/55"}`}>
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
