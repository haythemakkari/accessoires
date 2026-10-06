import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/InfoPage";
import { getShopSettings } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Livraison", description: "Frais, conditions de livraison et paiement à la réception." };

export default async function LivraisonPage() {
  const s = await getShopSettings();
  return (
    <InfoPage title="Livraison" intro="Tout ce qu'il faut savoir sur la réception de votre commande.">
      <section>
        <h2 className="h-display text-2xl text-ink">Frais de livraison</h2>
        <p className="mt-2">{formatPrice(s.shippingFee)} par commande.{s.freeShippingThreshold > 0 && <> La livraison est <strong>offerte dès {formatPrice(s.freeShippingThreshold)}</strong> d'achat (après réduction éventuelle).</>}</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Paiement</h2>
        <p className="mt-2">Vous réglez en espèces à la livraison, à la réception de votre colis.</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Confirmation et suivi</h2>
        <p className="mt-2">Après votre commande, nous vous contactons au numéro indiqué pour confirmer la livraison. Vous pouvez suivre l'état de votre colis à tout moment depuis la page « Suivi colis ».</p>
      </section>
    </InfoPage>
  );
}
