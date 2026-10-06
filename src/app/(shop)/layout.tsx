import { Header } from "@/components/shop/Header";
import { Footer } from "@/components/shop/Footer";
import { getShopSettings } from "@/lib/data";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic"; // la base n'est pas requise au build ; le cache applicatif limite les requêtes

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);
  return (
    <>
      <Header welcomeDiscount={settings.welcomeDiscountPercent} freeShippingThreshold={settings.freeShippingThreshold} siteName={env.siteName} initialUser={user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer siteName={env.siteName} />
    </>
  );
}
