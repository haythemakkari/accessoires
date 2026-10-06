import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Headset, Mail, MapPin, Smartphone, Truck } from "lucide-react";
import { ContactForm } from "@/components/shop/ContactForm";
import { getShopSettings } from "@/lib/data";
import { formatTunisianPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Contact", description: "Une question sur une commande, un produit ou une livraison ? Voici comment nous joindre." };

type Row = { icon: typeof Mail; label: string; value: string; note?: string; action?: { label: string; href: string } };

export default async function ContactPage() {
  const s = await getShopSettings();
  const rows = [
    s.contactPhone && { icon: Smartphone, label: "Par téléphone", value: formatTunisianPhone(s.contactPhone), note: s.contactHours, action: { label: "Appeler", href: `tel:${s.contactPhone}` } },
    s.contactEmail && { icon: Mail, label: "Par e-mail", value: s.contactEmail, note: s.contactEmailNote, action: { label: "Écrire un e-mail", href: `mailto:${s.contactEmail}` } },
    s.contactAddress && { icon: MapPin, label: "Notre adresse", value: s.contactAddress, note: s.contactAddressNote },
  ].filter(Boolean) as Row[];

  return (
    <div className="container-x space-y-6 py-10">
      {/* Bannière */}
      <header className="relative overflow-hidden rounded-[2rem] border border-brass/20 bg-gradient-to-br from-sand-100 via-sand-50 to-white px-6 py-8 sm:px-10">
        <div className="flex items-center gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-brass-dark shadow-sm"><Headset size={30} strokeWidth={1.5} /></span>
          <div>
            <h1 className="h-display text-3xl sm:text-4xl">Nous contacter</h1>
            <p className="mt-1 max-w-xl text-ink/65">Une question sur une commande, un produit ou une livraison ? Voici comment nous joindre.</p>
          </div>
        </div>
        <p className="h-display pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 -rotate-3 text-right text-2xl italic leading-tight text-brass-dark/80 lg:block">On répond vite,<br />promis</p>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-2">
        {/* Colonne gauche : cartes de contact + question sur une commande */}
        <div className="space-y-4">
          {rows.map(({ icon: Icon, label, value, note, action }) => (
            <div key={label} className="card flex flex-wrap items-center gap-4 p-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brass/10 text-brass-dark"><Icon size={24} strokeWidth={1.6} /></span>
              <div className="min-w-[11rem] flex-1">
                <p className="text-sm font-medium text-ink/55">{label}</p>
                <p className="break-words text-lg font-semibold">{value}</p>
                {note && <p className="text-sm text-ink/55">{note}</p>}
              </div>
              {action && <a href={action.href} className="rounded-full bg-brass/10 px-5 py-2.5 text-sm font-semibold text-brass-dark transition hover:bg-brass hover:text-white">{action.label}</a>}
            </div>
          ))}

          <aside className="card flex flex-wrap items-center gap-4 p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brass/10 text-brass-dark"><Truck size={24} strokeWidth={1.6} /></span>
            <div className="min-w-[11rem] flex-1">
              <h2 className="text-lg font-semibold leading-snug">Une question sur une commande ?</h2>
              <p className="mt-1 text-sm text-ink/60">Le suivi vous donne son état immédiatement, avec votre numéro de commande et votre téléphone.</p>
              <p className="mt-2 text-sm text-ink/55">Voir aussi : <Link href="/service-client/retours-echanges" className="underline underline-offset-4">Retours &amp; Échanges</Link> · <Link href="/service-client/faq" className="underline underline-offset-4">FAQ</Link></p>
            </div>
            <Link href="/service-client/suivi-commande" className="btn-brass !px-5 !py-2.5">Suivre ma commande <ArrowRight size={16} /></Link>
          </aside>
        </div>

        {/* Colonne droite : formulaire compact */}
        <section>
          <h2 className="h-display text-2xl">Envoyez-nous un message</h2>
          <p className="mb-4 mt-1 text-sm text-ink/60">Nous vous répondrons dès que possible.</p>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
