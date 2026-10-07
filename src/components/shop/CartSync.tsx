"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CART_MAX_AGE_MS, CART_STORAGE_KEY, cartCount, lineKey, useCart, type CartLine } from "@/stores/cart";
import { useUser } from "@/stores/user";
import { fetcher } from "@/lib/client/fetcher";
import { mergeCartRefs, type CartRef } from "@/lib/cart-merge";

type Hydrated =
  | { state: "ok" | "adjusted"; productId: string; variant?: string; quantity: number; requested: number; name: string; slug: string; image?: string; price: number; stock: number }
  | { state: "unavailable"; productId: string; variant?: string; reason: "missing" | "variant" | "soldout" };

const toRefs = (lines: CartLine[]): CartRef[] => lines.map((l) => ({ productId: l.productId, quantity: l.quantity, variant: l.variant }));
const hydrate = (refs: CartRef[]) => fetcher<{ lines: Hydrated[] }>("/api/cart/hydrate", { method: "POST", body: { items: refs } }).then((r) => r.lines);
const REASON = { missing: "n'est plus disponible", variant: "n'est plus proposé dans cette option", soldout: "est épuisé" } as const;

/**
 * Panier persistant. Rien à l'écran : ce composant
 *  1. garde le panier à jour au retour du client (produit retiré, prix ou stock changés) et lui dit que son panier l'attend ;
 *  2. synchronise les onglets du navigateur ;
 *  3. pour un client connecté, enregistre le panier sur son compte (retrouvé sur un autre appareil) et fusionne à la connexion.
 */
export function CartSync() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser((s) => s.user);
  const userLoaded = useUser((s) => s.loaded);
  const synced = useRef<string | null>(null); // id du client dont le panier serveur est déjà fusionné
  const applying = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const welcomed = useRef(false);

  /** Met les lignes à jour depuis le catalogue ; renvoie le nombre de lignes conservées. */
  const refresh = async (lines: CartLine[], opts: { notify: boolean }) => {
    if (lines.length === 0) return 0;
    const result = await hydrate(toRefs(lines));
    const prev = new Map(lines.map((l) => [lineKey(l.productId, l.variant), l]));
    const next: CartLine[] = [];
    const removed: string[] = [];
    const adjusted: string[] = [];
    let priceChanged = false;
    for (const r of result) {
      const old = prev.get(lineKey(r.productId, r.variant));
      if (r.state === "unavailable") { if (old) removed.push(`« ${old.name} » ${REASON[r.reason]}`); continue; }
      if (r.state === "adjusted") adjusted.push(r.name);
      if (old && Math.abs(old.price - r.price) > 0.001) priceChanged = true;
      next.push({ key: lineKey(r.productId, r.variant), productId: r.productId, slug: r.slug, name: r.name, image: r.image, price: r.price, quantity: r.quantity, variant: r.variant, stock: r.stock });
    }
    const changed = JSON.stringify(next) !== JSON.stringify(lines);
    if (changed) { applying.current = true; useCart.getState().setLines(next); applying.current = false; }
    if (opts.notify) {
      if (removed.length) toast.warning("Votre panier a été mis à jour", { description: `${removed.join(" · ")} — retiré${removed.length > 1 ? "s" : ""} du panier.`, duration: 9000 });
      if (adjusted.length) toast.info("Quantité ajustée selon le stock", { description: adjusted.join(", ") });
      if (priceChanged) toast.info("Les prix de votre panier ont été mis à jour");
    }
    return next.length;
  };

  const saveToAccount = () => {
    const { lines, couponCode } = useCart.getState();
    return fetcher("/api/cart", { method: "PUT", body: { items: toRefs(lines), couponCode } }).catch(() => {});
  };

  // 1) Au chargement du site : restaure le panier, vérifie sa validité, accueille le client.
  useEffect(() => {
    (async () => {
      await useCart.persist.rehydrate();
      const { lines, updatedAt, clear } = useCart.getState();
      if (lines.length && updatedAt && Date.now() - updatedAt > CART_MAX_AGE_MS) { clear(); return; } // panier abandonné depuis > 30 jours
      let kept = lines.length;
      try { kept = await refresh(lines, { notify: true }); } catch { /* hors ligne : on garde le panier tel quel */ }
      const onCartPage = /^\/(cart|checkout)/.test(window.location.pathname);
      if (kept > 0 && !onCartPage && !sessionStorage.getItem("ap_cart_welcomed")) {
        sessionStorage.setItem("ap_cart_welcomed", "1");
        welcomed.current = true;
        const count = cartCount(useCart.getState().lines);
        toast("Votre panier vous attend", { description: `${count} article${count > 1 ? "s" : ""} — vous pouvez reprendre votre commande.`, action: { label: "Voir le panier", onClick: () => router.push("/cart") }, duration: 8000 });
      }
    })();
    // 2) Un autre onglet modifie le panier → celui-ci se met à jour.
    const onStorage = (e: StorageEvent) => { if (e.key === CART_STORAGE_KEY) useCart.persist.rehydrate(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Client connecté : fusion du panier du compte avec celui du navigateur (une fois par connexion).
  useEffect(() => {
    if (!userLoaded) return;
    if (!user || user.role !== "customer") { synced.current = null; return; }
    if (synced.current === user.id) return;
    synced.current = user.id;
    (async () => {
      try {
        await useCart.persist.rehydrate();
        const server = await fetcher<{ items: CartRef[]; couponCode: string | null }>("/api/cart");
        const local = useCart.getState();
        const merged = mergeCartRefs(toRefs(local.lines), server.items);
        const before = cartCount(local.lines);
        if (merged.length) {
          const lines = await hydrate(merged);
          const kept: CartLine[] = lines.flatMap((r) => r.state === "unavailable" ? [] : [{ key: lineKey(r.productId, r.variant), productId: r.productId, slug: r.slug, name: r.name, image: r.image, price: r.price, quantity: r.quantity, variant: r.variant, stock: r.stock }]);
          applying.current = true;
          useCart.getState().setLines(kept, local.couponCode ?? server.couponCode);
          applying.current = false;
          const after = cartCount(kept);
          if (after > before && server.items.length) toast.success("Votre panier a été retrouvé", { description: `${after} article${after > 1 ? "s" : ""} enregistré${after > 1 ? "s" : ""} sur votre compte.`, action: { label: "Voir", onClick: () => router.push("/cart") } });
        }
        await saveToAccount();
      } catch { synced.current = null; /* on réessaiera au prochain chargement */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, user?.id, user?.role]);

  // 4) Après la fusion, chaque modification du panier est enregistrée sur le compte (regroupée : 1 requête pour plusieurs clics).
  useEffect(() => {
    const unsub = useCart.subscribe((s, p) => {
      if (applying.current || !useUser.getState().user || synced.current !== useUser.getState().user?.id) return;
      if (s.lines === p.lines && s.couponCode === p.couponCode) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(saveToAccount, 800);
    });
    return () => { unsub(); clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void pathname;
  return null;
}
