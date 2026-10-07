import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/InfoPage";
import { getShopSettings } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = { title: "FAQ", description: "Réponses à vos questions : commander sans compte, code de bienvenue, paiement à la livraison, frais de livraison, retours et suivi de colis chez Accessoires Plus." };

export default async function FaqPage() {
  const s = await getShopSettings();
  const w = s.welcomeDiscountPercent;
  const qa: [string, string][] = [
    ["Dois-je créer un compte pour commander ?", `Non. Vous pouvez commander sans compte : nous vous demandons seulement vos coordonnées et votre adresse de livraison. Un compte vous permet de suivre vos commandes${w > 0 ? " et de recevoir un code de bienvenue" : ""}.`],
    ...(w > 0 ? [["Comment fonctionne le code de bienvenue ?", `En créant un compte, vous recevez un code personnel de ${w} % de réduction (format WELCOME-XXXXXX). Il est visible dans votre espace, utilisable une seule fois et réservé à votre compte.`] as [string, string]] : []),
    ["Comment puis-je payer ?", "Le paiement se fait en espèces à la livraison, à la réception de votre commande."],
    ["Quels sont les frais de livraison ?", `${formatPrice(s.shippingFee)} par commande${s.freeShippingThreshold > 0 ? `, et la livraison est offerte dès ${formatPrice(s.freeShippingThreshold)} d'achat` : ""}.`],
    ["Comment suivre ma commande ?", "Avec votre numéro de commande et votre numéro de téléphone, depuis la page « Suivi colis » (lien en bas de page). Si vous avez un compte, toutes vos commandes sont aussi dans « Mes commandes »."],
    ["Puis-je retourner un article ?", "Oui : vous disposez de 7 jours à compter de la réception pour retourner un article qui ne vous convient pas, sans justification. Les conditions détaillées sont dans la page « Retours & Échanges »."],
    ["Puis-je modifier ou annuler ma commande ?", "Tant qu'elle n'est pas expédiée, contactez-nous en indiquant votre numéro de commande."],
  ];
  return (
    <InfoPage title="Questions fréquentes">
      <JsonLd data={{ "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }} />
      {qa.map(([q, a]) => (
        <details key={q} className="card group p-5">
          <summary className="cursor-pointer list-none font-medium marker:hidden">{q}</summary>
          <p className="mt-3 text-ink/70">{a}</p>
        </details>
      ))}
    </InfoPage>
  );
}
