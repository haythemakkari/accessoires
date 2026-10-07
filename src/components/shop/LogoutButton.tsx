"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { useUser } from "@/stores/user";
import { useCart } from "@/stores/cart";

export function LogoutButton({ className = "whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm text-clay hover:bg-sand-100" }: { className?: string }) {
  const router = useRouter();
  const setUser = useUser((s) => s.set);
  return (
    <button className={className} onClick={async () => {
      await fetcher("/api/auth/logout", { method: "POST" });
      setUser(null);
      useCart.getState().clear(); // poste partagé : le panier local disparaît ; celui du compte reste enregistré
      toast.success("Vous êtes déconnecté");
      router.push("/");
      router.refresh();
    }}>Déconnexion</button>
  );
}
