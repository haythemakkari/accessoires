"use client";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { useUser } from "@/stores/user";
import { CartSync } from "@/components/shop/CartSync";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useUser.getState().refresh();
    // Retour de « Continuer avec Google » : message d'accueil, puis le cookie temporaire est effacé.
    const m = document.cookie.match(/(?:^|; )ap_google_welcome=(new|back)/);
    if (m) {
      document.cookie = "ap_google_welcome=; Max-Age=0; path=/";
      if (m[1] === "new") toast.success("Bienvenue ! Votre compte a été créé avec Google", { description: "Votre code de bienvenue (s'il y en a un) se trouve dans « Mon compte ».", duration: 8000 });
      else toast.success("Connexion réussie avec Google");
    }
  }, []);
  return (
    <>
      {children}
      <CartSync />
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { borderRadius: 14 } }} />
    </>
  );
}
