import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Ban, Banknote, Check, Clock, FileText, MessageCircle, Package, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { OnThisPage } from "@/components/shop/OnThisPage";
import { getShopSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Retours & Échanges",
  description: "Retours et échanges sous 7 jours à compter de la livraison : conditions, marche à suivre, remboursement et articles non repris chez Accessoires Plus.",
  alternates: { canonical: "/service-client/retours-echanges" },
};

const SECTIONS = [
  { id: "delai", label: "Délai" },
  { id: "articles", label: "Articles échangeables" },
  { id: "comment-faire", label: "Comment faire" },
  { id: "par-envoi", label: "Par envoi" },
  { id: "remboursement", label: "Remboursement" },
];

const Icon = ({ children }: { children: React.ReactNode }) => <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-brass-dark">{children}</span>;

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <h2 className="h-display text-3xl text-ink">{title}</h2>
      {lead && <p className="mt-1.5 text-ink/65">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Card = ({ icon, title, tone = "default", children }: { icon: React.ReactNode; title: string; tone?: "default" | "warn"; children: React.ReactNode }) => (
  <div className={`rounded-2xl border p-5 ${tone === "warn" ? "border-clay/20 bg-clay/5" : "border-ink/10 bg-white"}`}>
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === "warn" ? "bg-white text-clay" : "bg-sand-100 text-brass-dark"}`}>{icon}</span>
    <h3 className="mt-3 text-lg font-semibold text-ink">{title}</h3>
    <div className="mt-1.5 text-sm leading-relaxed text-ink/75">{children}</div>
  </div>
);

export default async function RetoursPage() {
  const s = await getShopSettings();
  const digits = s.contactPhone.replace(/\D/g, "");
  const contact = [s.contactEmail && `par e-mail à ${s.contactEmail}`, s.contactPhone && `au ${s.contactPhone}`].filter(Boolean).join(" ou ");

  return (
    <div className="container-x py-8 lg:py-10">
      <nav aria-label="Fil d'Ariane" className="text-xs text-ink/65">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Accueil</Link></li><li aria-hidden>›</li>
          <li><Link href="/service-client/faq" className="hover:text-ink">Informations</Link></li><li aria-hidden>›</li>
          <li aria-current="page" className="text-ink">Retours &amp; Échanges</li>
        </ol>
      </nav>

      <header className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <p className="eyebrow">Aide · Retours &amp; échanges</p>
          <h1 className="h-display mt-3 text-4xl sm:text-5xl">Retours &amp; Échanges</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/65">
            Un accessoire ne vous convient pas ? Vous avez <strong className="text-ink">7 jours</strong> à compter de la livraison pour nous le retourner ou l’échanger. Un article défectueux ou une erreur de notre part est entièrement pris en charge.
          </p>
        </div>
        <aside className="rounded-3xl border border-brass/25 bg-sand-100/70 p-6" aria-label="L'essentiel">
          <p className="eyebrow !text-brass-dark">L’essentiel</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3"><Icon><Clock size={18} /></Icon><span><strong>7 jours</strong> pour échanger, à compter de la livraison</span></li>
            <li className="flex items-center gap-3"><Icon><Package size={18} /></Icon><span><strong>Par envoi</strong> : après accord du service client</span></li>
            <li className="flex items-center gap-3"><Icon><ShieldCheck size={18} /></Icon><span><strong>Défectueux ou erreur</strong> : pris en charge</span></li>
            <li className="flex items-center gap-3"><Icon><Banknote size={18} /></Icon><span><strong>Remboursement</strong> sous 5 jours ouvrés</span></li>
          </ul>
          <Link href="/service-client/demande-echange" className="btn-primary mt-5 w-full">Demander un échange <ArrowRight size={16} /></Link>
        </aside>
      </header>

      <hr className="my-10 border-ink/10" />

      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <OnThisPage items={SECTIONS} />
        <div className="min-w-0 max-w-3xl space-y-14">
          <Section id="delai" title="Délai d’échange" lead="7 jours calendaires à compter de la livraison de votre commande.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card icon={<ShoppingBag size={18} />} title="À partir de la livraison">Le délai de 7 jours commence quand votre commande est marquée « livrée » par notre équipe, et non le jour où vous la passez.</Card>
              <Card icon={<Check size={18} />} title="Sans justification">Vous n’avez pas à expliquer votre choix : un article qui ne vous convient pas peut être retourné ou échangé.</Card>
            </div>
          </Section>

          <Section id="articles" title="Articles échangeables" lead="L’article doit revenir dans son état d’origine.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card icon={<Check size={18} />} title="Acceptés">
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Article <strong>neuf, non porté</strong>, sans trace d’usage ni rayure</li>
                  <li>Dans son <strong>emballage d’origine</strong>, avec ses protections (pochette, boîte, étiquettes)</li>
                  <li>Accompagné de votre <strong>numéro de commande</strong></li>
                </ul>
              </Card>
              <Card icon={<Ban size={18} />} title="Non échangeables" tone="warn">
                <ul className="list-disc space-y-1.5 pl-5">
                  <li><strong>Articles soldés</strong> ou en <strong>promotion flash</strong>, quand c’est indiqué</li>
                  <li><strong>Articles d’hygiène ouverts</strong> (boucles d’oreilles, écharpe…)</li>
                  <li>Exception : défaut de fabrication ou erreur de notre part</li>
                </ul>
              </Card>
            </div>
          </Section>

          <Section id="comment-faire" title="Comment faire" lead="Contactez-nous avant de renvoyer quoi que ce soit : nous vous guidons.">
            <ol className="grid gap-6 sm:grid-cols-2">
              {[
                ["Contactez-nous", <>{contact ? <>Écrivez-nous {contact}</> : <>Contactez notre service client</>}, avec votre n° de commande (forme NM-AAMMJJ-XXXXXX), l’article concerné et, si vous le souhaitez, le motif.</>],
                ["Recevez l’accord", "Nous vous indiquons comment nous retourner l’article."],
                ["Renvoyez l’article", "Dans son état d’origine, avec son emballage, ses étiquettes et votre numéro de commande."],
                ["Échange ou remboursement", "Après contrôle, le nouvel article est expédié (dans la limite des stocks) ou l’article est remboursé."],
              ].map(([t, d], i) => (
                <li key={String(t)} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-sand-50">{i + 1}</span>
                  <div><h3 className="font-semibold text-ink">{t}</h3><p className="mt-1 text-sm leading-relaxed text-ink/70">{d}</p></div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="par-envoi" title="Par envoi" lead="Renvoyez l’article à l’adresse indiquée dans notre accord. Le nouvel article part dès réception et contrôle ; une différence de prix est régularisée selon le cas.">
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white text-sm">
              <div className="hidden grid-cols-[1.3fr_1fr_1fr] gap-4 bg-sand-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink/60 sm:grid"><span>Situation</span><span>Frais d’envoi</span><span>Solution</span></div>
              {[
                ["Article défectueux ou non conforme", "Pris en charge par nous", "Échange ou remboursement"],
                ["Erreur de notre part (mauvais article)", "Pris en charge par nous", "Échange ou remboursement"],
                ["Changement d’avis", "À votre charge", "Échange uniquement"],
              ].map(([a, b, c]) => (
                <div key={a} className="grid gap-1 border-t border-ink/10 px-5 py-3.5 first:border-t-0 sm:grid-cols-[1.3fr_1fr_1fr] sm:gap-4 sm:first:border-t sm:[&:nth-child(2)]:border-t">
                  <span className="font-medium text-ink">{a}</span><span className="text-ink/75"><span className="text-xs text-ink/50 sm:hidden">Frais d’envoi : </span>{b}</span><span className="text-ink/75">{c}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="remboursement" title="Remboursement" lead="Pour un article défectueux, abîmé ou non conforme, ou une erreur de notre part : remboursement du prix total, frais de livraison inclus, ou renvoi du bon article sans frais.">
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white text-sm">
              <div className="hidden grid-cols-[1fr_1.4fr_1fr] gap-4 bg-sand-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink/60 sm:grid"><span>Paiement initial</span><span>Remboursement</span><span>Délai</span></div>
              <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[1fr_1.4fr_1fr] sm:gap-4">
                <span className="font-medium text-ink">Paiement à la livraison (espèces)</span>
                <span className="text-ink/75">Mode convenu avec vous lors de la validation de votre retour</span>
                <span className="text-ink/75">5 jours ouvrés après réception et contrôle</span>
              </div>
            </div>
          </Section>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brass/25 bg-sand-100/70 p-6">
            <div>
              <h2 className="h-display text-2xl text-ink">Besoin d’aide pour un échange ?</h2>
              {s.contactHours && <p className="mt-1 text-sm text-ink/65">Notre service client vous répond : {s.contactHours}</p>}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {digits && <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="btn-primary !bg-emerald-700 hover:!bg-emerald-800"><MessageCircle size={16} /> WhatsApp {s.contactPhone}</a>}
              <Link href="/contact" className="btn-outline"><FileText size={16} /> Nous écrire</Link>
              <Link href="/service-client/livraison" className="btn-outline"><Truck size={16} /> Livraison</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
