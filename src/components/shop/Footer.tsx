import Link from "next/link";
import { asset } from "@/lib/assets";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { SERVICE_LINKS, SOCIAL_LINKS, USEFUL_LINKS } from "@/lib/navigation";

export function Footer({ siteName }: { siteName: string }) {
  // Téléphone (< 768 px) : seule la mention « Powered & developed by » reste visible. Tablette et ordinateur : pied de page complet.
  return (
    <footer className="mt-8 bg-ink pb-[calc(4rem+env(safe-area-inset-bottom))] text-sand-200 md:mt-24 lg:pb-0">
      <div className="container-x hidden gap-10 py-16 sm:grid-cols-2 md:grid lg:grid-cols-4">
        <div>
          {/* Logo version « fond sombre » (lettres blanches + doré), directement sur le fond noir */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/logo-footer-dark.webp")} alt={siteName} width={400} height={234} loading="lazy" className="h-auto w-44 sm:w-52" />
          <p className="mt-4 text-balance text-sm leading-relaxed text-sand-300/80">{siteName} — L’élégance en détail.</p>
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${siteName} sur Instagram`} title="Suivez-nous sur Instagram"
            className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-sand-200 transition hover:-translate-y-0.5 hover:border-brass-light hover:bg-brass hover:text-white">
            <InstagramIcon size={20} />
          </a>
        </div>
        <div>
          <p className="eyebrow !text-brass-light">Liens utiles</p>
          <ul className="mt-4 space-y-2 text-sm">
            {USEFUL_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="transition hover:text-white">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-brass-light">Mon espace</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/account" className="transition hover:text-white">Mon compte</Link></li>
            <li><Link href="/account/orders" className="transition hover:text-white">Mes commandes</Link></li>
            <li><Link href="/cart" className="transition hover:text-white">Panier</Link></li>
            <li><Link href="/register" className="transition hover:text-white">Créer un compte</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-brass-light">Service client</p>
          <ul className="mt-4 space-y-2 text-sm">
            {SERVICE_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="transition hover:text-white">{l.label}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="py-3 text-xs text-sand-300/70 md:border-t md:border-white/10 md:py-5">
        <div className="container-x flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <span className="hidden md:inline">© {new Date().getFullYear()} {siteName}. Tous droits réservés.</span>
          <span aria-hidden="true" className="hidden md:inline">·</span>
          <span>
            Powered &amp; developed by{" "}
            <a href="https://www.linkedin.com/in/haythem-akkari" target="_blank" rel="noopener noreferrer" className="font-medium text-brass-light underline-offset-4 transition hover:text-white hover:underline">Haythem Akkari</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
