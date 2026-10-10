import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/shop/AuthForm";
import { getShopSettings } from "@/lib/data";
import { googleButtonVisible } from "@/lib/google-oauth";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function Page() {
  if (await getCurrentUser()) redirect("/account");
  const { welcomeDiscountPercent } = await getShopSettings();
  return <Suspense><AuthForm mode="login" welcomeDiscount={welcomeDiscountPercent} google={googleButtonVisible()} /></Suspense>;
}
