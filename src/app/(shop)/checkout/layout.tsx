import type { Metadata } from "next";

// Pages privées (panier, paiement) : utiles aux clients, sans valeur pour un moteur de recherche.
export const metadata: Metadata = { title: "Commande", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
