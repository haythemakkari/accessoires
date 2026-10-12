"use client";
import { useEffect } from "react";
import { Gift } from "lucide-react";
import { useCart } from "@/stores/cart";
import { formatPrice } from "@/lib/utils";
import { GIFT_MESSAGE_MAX } from "@/lib/gift";
import { useGiftBox } from "./useGiftBox";

/** Option « Box cadeau » du panier : une case à cocher (prix fixé par l'admin) et un court message pour la carte. Invisible si l'admin l'a désactivée. */
export function GiftBoxOption({ className = "" }: { className?: string }) {
  const info = useGiftBox();
  const giftBox = useCart((s) => s.giftBox);
  const message = useCart((s) => s.giftMessage);
  const setGift = useCart((s) => s.setGift);

  // L'admin a désactivé l'option alors qu'elle était cochée dans un panier enregistré : on la décoche.
  useEffect(() => { if (info && !info.enabled && giftBox) setGift(false); }, [info, giftBox, setGift]);
  if (!info?.enabled) return null;

  return (
    <div className={className}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={giftBox} onChange={(e) => setGift(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-brass" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><Gift size={16} className="text-brass-dark" /> Box cadeau</span>
            <span className="text-sm font-semibold tabular-nums">+ {formatPrice(info.price)}</span>
          </span>
          {info.description && <span className="mt-0.5 block text-xs leading-snug text-ink/60">{info.description}</span>}
        </span>
      </label>
      {giftBox && (
        <div className="mt-3">
          <label htmlFor="gift-message" className="label">Message pour la carte <span className="normal-case tracking-normal text-ink/50">(facultatif)</span></label>
          <textarea id="gift-message" rows={2} maxLength={GIFT_MESSAGE_MAX} value={message} onChange={(e) => setGift(true, e.target.value)} placeholder="Ex. Joyeux anniversaire Sara, avec tout mon amour" className="input" />
          <p className="mt-1 text-right text-xs text-ink/50">{message.length}/{GIFT_MESSAGE_MAX}</p>
        </div>
      )}
    </div>
  );
}
