"use client";
import { useEffect, useState } from "react";
import { fetcher } from "@/lib/client/fetcher";

export type GiftBoxInfo = { enabled: boolean; price: number; description: string };
let cache: { at: number; value: GiftBoxInfo } | null = null;
const TTL = 30_000;

/** Réglage de la box cadeau (activée ? prix, description). Court cache en mémoire : le prix facturé est de toute façon recalculé par le serveur. */
export function useGiftBox() {
  const [info, setInfo] = useState<GiftBoxInfo | null>(cache && Date.now() - cache.at < TTL ? cache.value : null);
  useEffect(() => {
    if (cache && Date.now() - cache.at < TTL) { setInfo(cache.value); return; }
    let off = false;
    fetcher<GiftBoxInfo>("/api/shop/gift-box").then((v) => { cache = { at: Date.now(), value: v }; if (!off) setInfo(v); }).catch(() => !off && setInfo({ enabled: false, price: 0, description: "" }));
    return () => { off = true; };
  }, []);
  return info;
}
