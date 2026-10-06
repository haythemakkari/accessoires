import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/InfoPage";

export const metadata: Metadata = {
  title: "Retours & Échanges",
  description: "Délai de rétractation de 7 jours, conditions de retour, remboursement et articles non repris.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h-display text-2xl text-ink">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default function RetoursPage() {
  return (
    <InfoPage title="Retours & Échanges" intro="Un accessoire qui ne vous convient pas ? Vous pouvez nous le retourner ou l’échanger.">
      <Section title="Vous avez 7 jours">
        <p>À compter de la réception de votre colis, vous disposez de <strong>7 jours</strong> pour nous demander le retour ou l’échange d’un article, sans avoir à vous justifier.</p>
      </Section>

      <Section title="Conditions">
        <p>Pour que votre demande soit acceptée, l’article doit être :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>dans son état d’origine : neuf, non porté, sans trace d’usage ni rayure</li>
          <li>dans son emballage d’origine, avec ses protections (pochette, boîte, étiquettes)</li>
          <li>accompagné de votre numéro de commande</li>
        </ul>
      </Section>

      <Section title="Comment faire une demande">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Retrouvez votre numéro de commande (de la forme NM-AAMMJJ-XXXXXX), reçu lors de votre commande.</li>
          <li>Contactez notre service client en indiquant ce numéro, l’article concerné et, si vous le souhaitez, le motif.</li>
          <li>Nous vous indiquons comment nous retourner l’article et nous organisons la suite avec vous.</li>
        </ol>
      </Section>

      <Section title="Échange">
        <p>Pour un échange (autre modèle, autre couleur…), le nouvel article vous est expédié dès que nous avons reçu et contrôlé l’article retourné, dans la limite des stocks disponibles.</p>
      </Section>

      <Section title="Remboursement">
        <p>Vous payez à la livraison : le mode de remboursement est donc convenu avec vous lors de la validation de votre retour. Une fois l’article reçu et contrôlé, le remboursement est effectué sous <strong>5 jours ouvrés</strong>.</p>
      </Section>

      <Section title="Articles non repris">
        <p>Pour des raisons d’hygiène, les boucles d’oreilles ne peuvent être ni reprises ni échangées, sauf en cas de défaut de fabrication ou d’erreur de notre part.</p>
        <p>Un article reçu abîmé ou différent de votre commande ? Contactez-nous dès la réception : nous le remplaçons ou le remboursons.</p>
      </Section>
    </InfoPage>
  );
}
