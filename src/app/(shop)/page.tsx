import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getHomeData, getShopSettings } from "@/lib/data";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Reveal } from "@/components/ui/Reveal";
import { HeroMedia } from "@/components/shop/HeroMedia";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION, organizationJsonLd } from "@/lib/seo";
import { env } from "@/lib/env";
import { asset } from "@/lib/assets";

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

export const metadata: Metadata = {
  title: { absolute: `${env.siteName} — Bijoux, montres, sacs & accessoires de mode | Tunisie` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export const revalidate = 60; // page pré-générée, régénérée au plus toutes les 60 s

export default async function HomePage() {
  const [home, settings] = await Promise.all([getHomeData(), getShopSettings()]);

  return (
    <>
      <JsonLd data={organizationJsonLd(settings)} />
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
                {(settings.heroMediaType === "image" && settings.heroImages.length > 0) || (settings.heroMediaType === "video" && settings.heroMediaUrl) ? (
                  <HeroMedia type={settings.heroMediaType as "image" | "video"} images={settings.heroImages} url={settings.heroMediaUrl} poster={settings.heroPosterUrl || undefined} alt={settings.heroAlt || env.siteName} />
                ) : (
                  // Aucun média choisi par l'admin : visuel de marque (jamais une photo de produit)
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand-100 to-sand-200 p-10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset("/logo.webp")} alt={env.siteName} width={640} height={93} className="w-full max-w-[18rem]" />
                  </div>
                )}
              </div>
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
