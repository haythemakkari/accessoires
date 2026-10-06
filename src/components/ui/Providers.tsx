"use client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { useCart } from "@/stores/cart";
import { useUser } from "@/stores/user";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useCart.persist.rehydrate();
    useUser.getState().refresh();
  }, []);
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { borderRadius: 14 } }} />
    </>
  );
}
