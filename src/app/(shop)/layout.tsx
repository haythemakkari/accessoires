import { Header } from "@/components/shop/Header";
import { MobileTabBar } from "@/components/shop/MobileTabBar";
import { Footer } from "@/components/shop/Footer";
import { getShopSettings } from "@/lib/data";
import { env } from "@/lib/env";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getShopSettings(); // en cache (120 s) : pas de requête base à chaque visite
  return (
    // Colonne pleine hauteur : sur une page courte, le pied de page reste collé au bas de l'écran (pas de vide sous le noir)
    <div className="flex min-h-dvh flex-col">
      <Header welcomeDiscount={settings.welcomeDiscountPercent} freeShippingThreshold={settings.freeShippingThreshold} contactPhone={settings.contactPhone} announcements={settings.announcements.filter((a) => a.isActive).map((a) => a.text)} siteName={env.siteName} />
      <main id="contenu" tabIndex={-1} className="w-full flex-1 outline-none">{children}</main>
      <Footer siteName={env.siteName} />
      <MobileTabBar />
    </div>
  );
}
