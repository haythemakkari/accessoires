"use client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { useUser } from "@/stores/user";
import { CartSync } from "@/components/shop/CartSync";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useUser.getState().refresh();
  }, []);
  return (
    <>
      {children}
      <CartSync />
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { borderRadius: 14 } }} />
    </>
  );
}
