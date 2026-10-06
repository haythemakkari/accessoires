import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/InfoPage";
import { TrackForm } from "@/components/shop/TrackForm";

export const metadata: Metadata = { title: "Suivi colis", description: "Suivez l'état de votre colis avec votre numéro de commande et votre téléphone." };

export default function SuiviPage() {
  return (
    <InfoPage title="Suivi colis" intro="Saisissez votre numéro de commande et le téléphone utilisé lors de la commande pour voir où en est votre colis.">
      <TrackForm />
    </InfoPage>
  );
}
