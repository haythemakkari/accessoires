import Link from "next/link";
import { ArrowRight, Gift, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getHomeData, getShopSettings } from "@/lib/data";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Reveal } from "@/components/ui/Reveal";
import { ProductImage } from "@/components/ui/ProductImage";
import { env } from "@/lib/env";

function Section({ eyebrow, title, href, children }: { eyebrow: string; title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container-x mt-20 sm:mt-28">
      <Reveal className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="h-display mt-2 text-3xl sm:text-4xl">{title}</h2>
        </div>
        {href && <Link href={href} className="group hidden items-center gap-1.5 text-sm font-medium sm:flex">Tout voir <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>}
      </Reveal>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [home, settings] = await Promise.all([getHomeData(), getShopSettings()]);
  const hero = home.featured[0] ?? home.latest[0];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <Reveal>
            <p className="eyebrow">Nouvelle collection</p>
            <h1 className="h-display mt-4 text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Les détails qui <em className="text-brass-dark">font</em> le style.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/65">Portefeuilles, montres, sacs, bijoux… Des accessoires pensés pour durer, pour elle comme pour lui.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary">Découvrir la boutique <ArrowRight size={16} /></Link>
              <Link href="/register" className="btn-outline">{settings.welcomeDiscountPercent > 0 ? `-${settings.welcomeDiscountPercent}% à l’inscription` : "Créer un compte"}</Link>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
              <div className="absolute -right-4 -top-4 h-full w-full rounded-[2rem] border border-brass/40" />
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-sand-100">
                <ProductImage src={hero?.images[0]} alt={hero?.name ?? env.siteName} priority />
              </div>
              {hero && (
                <Link href={`/products/${hero.slug}`} className="absolute -bottom-4 -left-4 rounded-2xl bg-white px-5 py-3 shadow-xl transition hover:-translate-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-ink/45">À la une</p>
                  <p className="text-sm font-medium">{hero.name}</p>
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* BANDEAU */}
      <div className="overflow-hidden border-y border-ink/10 bg-white py-4" aria-hidden>
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-xl text-ink/70">
          {[...Array(2)].flatMap((_, k) => ["Portefeuilles", "Montres", "Sacs", "Bracelets", "Lunettes", "Bijoux", "Ceintures", "Casquettes"].map((w) => <span key={`${k}${w}`}>{w} <span className="text-brass">✦</span></span>))}
        </div>
      </div>

      {home.featured.length > 0 && <Section eyebrow="Sélection" title="Produits populaires" href="/products?featured=true"><ProductGrid products={home.featured.slice(0, 4)} /></Section>}
      {home.latest.length > 0 && <Section eyebrow="Just in" title="Nouveautés" href="/products?sort=newest"><ProductGrid products={home.latest.slice(0, 4)} /></Section>}

      {/* PROMO CTA (masquée si l'offre de bienvenue est désactivée) */}
      {settings.welcomeDiscountPercent > 0 && (
      <section className="container-x mt-20 sm:mt-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center text-sand-50 sm:px-16">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brass/20 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-clay/20 blur-3xl" />
            <p className="eyebrow !text-brass-light">Offre de bienvenue</p>
            <h2 className="h-display mx-auto mt-3 max-w-2xl text-3xl sm:text-5xl">{settings.welcomeDiscountPercent}% de réduction sur votre première commande</h2>
            <p className="mx-auto mt-4 max-w-md text-sand-300/80">Créez votre compte en 30 secondes : votre code personnel vous attend dans votre espace.</p>
            <Link href="/register" className="btn-brass mt-8">Créer mon compte</Link>
          </div>
        </Reveal>
      </section>
      )}

      {home.sale.length > 0 && <Section eyebrow="Offres" title="En promotion" href="/promotions"><ProductGrid products={home.sale} /></Section>}
      {home.best.length > 0 && <Section eyebrow="Plébiscités" title="Meilleures ventes" href="/products?sort=popular"><ProductGrid products={home.best.slice(0, 4)} /></Section>}

      {/* AVANTAGES */}
      <section className="container-x mt-20 sm:mt-28">
        <div className="grid gap-6 rounded-[2rem] bg-sand-100 p-8 sm:grid-cols-2 lg:grid-cols-4 lg:p-12">
          {[
            { i: Truck, t: "Livraison rapide", d: settings.freeShippingThreshold > 0 ? `Partout en Tunisie, offerte dès ${settings.freeShippingThreshold} DT.` : "Partout en Tunisie." },
            { i: ShieldCheck, t: "Paiement à la livraison", d: "Vous payez uniquement à la réception." },
            { i: RotateCcw, t: "Qualité contrôlée", d: "Chaque article est vérifié avant l’envoi." },
            { i: Gift, t: "Cadeau de bienvenue", d: `-${settings.welcomeDiscountPercent}% dès la création de votre compte.`, show: settings.welcomeDiscountPercent > 0 },
          ].filter((x) => !("show" in x) || x.show).map(({ i: Icon, t, d }, k) => (
            <Reveal key={t} delay={k * 0.07}>
              <Icon className="text-brass-dark" size={28} strokeWidth={1.5} />
              <p className="mt-3 font-medium">{t}</p>
              <p className="mt-1 text-sm text-ink/60">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
