import Link from "next/link";
import { SERVICE_LINKS, USEFUL_LINKS } from "@/lib/navigation";

export function Footer({ siteName }: { siteName: string }) {
  // Masqué sur téléphone (< 768 px), affiché à partir de la tablette.
  return (
    <footer className="mt-24 hidden bg-ink text-sand-200 md:block">
      <div className="container-x grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* Logo noir : affiché en blanc (brightness-0 + invert) sur le fond sombre du pied de page */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-footer.png" alt={siteName} width={1200} height={702} loading="lazy" className="h-auto w-36 brightness-0 invert sm:w-40" />
          <p className="mt-4 text-sm leading-relaxed text-sand-300/80">Accessoires de mode pour homme et femme, choisis avec exigence et livrés avec soin.</p>
        </div>
        <div>
          <p className="eyebrow !text-brass-light">Liens utiles</p>
          <ul className="mt-4 space-y-2 text-sm">
            {USEFUL_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-brass-light">Mon espace</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/account" className="hover:text-white">Mon compte</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">Mes commandes</Link></li>
            <li><Link href="/cart" className="hover:text-white">Panier</Link></li>
            <li><Link href="/register" className="hover:text-white">Créer un compte</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-brass-light">Service client</p>
          <ul className="mt-4 space-y-2 text-sm">
            {SERVICE_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-sand-300/60">© {new Date().getFullYear()} {siteName}. Tous droits réservés.</div>
    </footer>
  );
}
