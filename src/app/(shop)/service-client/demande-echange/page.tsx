import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Info, MessageSquareText, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";

export const metadata: Metadata = {
  title: "Demande d'échange",
  description: "Demandez l'échange d'un article de votre commande : nous vous répondons et vous suivez votre demande depuis votre compte.",
  robots: { index: false, follow: true },
};

export default function DemandeEchangePage() {
  return (
    <div className="container-x py-8 lg:py-10">
      <nav aria-label="Fil d'Ariane" className="text-xs text-ink/65">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Accueil</Link></li><li aria-hidden>›</li>
          <li><Link href="/service-client/retours-echanges" className="hover:text-ink">Retours &amp; Échanges</Link></li><li aria-hidden>›</li>
          <li aria-current="page" className="text-ink">Demande d’échange</li>
        </ol>
      </nav>
      <header className="mt-5">
        <h1 className="h-display text-4xl sm:text-5xl">Demande d’échange</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink/65">Indiquez votre commande et l’article concerné. Nous vous répondons ici, et vous retrouvez votre demande et nos réponses dans votre compte.</p>
      </header>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ContactForm kind="exchange" />
        <aside className="space-y-4 rounded-3xl border border-brass/25 bg-sand-100/70 p-6 text-sm leading-relaxed text-ink/75" aria-label="Rappel">
          <p className="eyebrow !text-brass-dark">Avant de commencer</p>
          <p className="flex gap-3"><Clock size={18} className="mt-0.5 shrink-0 text-brass-dark" /><span>Commande <strong className="text-ink">livrée depuis moins de 7 jours</strong> (date confirmée par notre équipe).</span></p>
          <p className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-brass-dark" /><span>Article <strong className="text-ink">neuf, non porté</strong>, dans son emballage d’origine.</span></p>
          <p className="flex gap-3"><MessageSquareText size={18} className="mt-0.5 shrink-0 text-brass-dark" /><span>Ne renvoyez rien avant notre <strong className="text-ink">accord</strong> : nous vous indiquons la marche à suivre.</span></p>
          <p className="flex gap-3"><Info size={18} className="mt-0.5 shrink-0 text-brass-dark" /><span><strong className="text-ink">Une seule demande</strong> est possible par commande. Connecté, vous choisissez votre commande dans la liste ; sinon, saisissez son numéro (<span className="font-mono">NM-AAMMJJ-XXXXXX</span>).</span></p>
          <Link href="/service-client/retours-echanges" className="inline-block font-medium text-ink underline underline-offset-4">Lire la politique complète</Link>
        </aside>
      </div>
    </div>
  );
}
