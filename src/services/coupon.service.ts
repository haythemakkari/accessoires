import { randomBytes } from "crypto";
import type { Types } from "mongoose";
import { Coupon, type CouponDoc } from "@/models/Coupon";
import { AppError } from "@/lib/errors";
import { computeDiscount } from "./pricing";

/** Vérifie la validité d'un coupon (pure, testable). Lance une AppError si invalide. */
export function assertCouponUsable(
  c: Pick<CouponDoc, "isActive" | "startsAt" | "expiresAt" | "maxUses" | "usedCount" | "minOrderAmount" | "allowedUsers">,
  userId: string | null,
  subtotal: number,
  now = new Date(),
) {
  if (!c.isActive) throw new AppError("Ce code promo n'est plus actif", 422, "COUPON_INACTIVE");
  if (c.startsAt && c.startsAt > now) throw new AppError("Ce code promo n'est pas encore valable", 422, "COUPON_NOT_STARTED");
  if (c.expiresAt && c.expiresAt < now) throw new AppError("Ce code promo a expiré", 422, "COUPON_EXPIRED");
  if (c.maxUses != null && c.usedCount >= c.maxUses) throw new AppError("Ce code promo a déjà été utilisé", 422, "COUPON_EXHAUSTED");
  if (c.allowedUsers.length > 0) {
    if (!userId) throw new AppError("Connectez-vous pour utiliser ce code", 422, "COUPON_LOGIN_REQUIRED");
    if (!c.allowedUsers.some((u) => String(u) === userId)) throw new AppError("Ce code ne vous est pas destiné", 422, "COUPON_NOT_ALLOWED");
  }
  if (subtotal < (c.minOrderAmount ?? 0)) {
    throw new AppError(`Montant minimum de commande : ${c.minOrderAmount} DT`, 422, "COUPON_MIN_AMOUNT");
  }
}

export async function validateCoupon(code: string, userId: string | null, subtotal: number) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) throw new AppError("Code promo invalide", 422, "COUPON_INVALID");
  assertCouponUsable(coupon, userId, subtotal);
  return { coupon, discount: computeDiscount(coupon, subtotal) };
}

/**
 * Consomme atomiquement une utilisation. La condition usedCount < maxUses est dans le filtre,
 * donc deux commandes simultanées ne peuvent pas utiliser le même coupon à usage unique.
 */
export async function redeemCoupon(couponId: Types.ObjectId | string) {
  const updated = await Coupon.findOneAndUpdate(
    { _id: couponId, isActive: true, $or: [{ maxUses: null }, { maxUses: { $exists: false } }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }] },
    { $inc: { usedCount: 1 } },
    { returnDocument: "after" },
  );
  if (!updated) throw new AppError("Ce code promo n'est plus disponible", 422, "COUPON_EXHAUSTED");
  // Seul le coupon de bienvenue est désactivé à l'usage. Un coupon standard épuisé reste « actif » :
  // assertCouponUsable refuse déjà usedCount >= maxUses, et l'annulation d'une commande le rend de nouveau utilisable.
  if (updated.kind === "welcome") await Coupon.updateOne({ _id: updated._id }, { isActive: false });
  return updated;
}

export async function releaseCoupon(couponId: Types.ObjectId | string, reactivate: boolean) {
  await Coupon.updateOne({ _id: couponId as Types.ObjectId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 }, ...(reactivate ? { isActive: true } : {}) });
}

export async function createWelcomeCoupon(userId: Types.ObjectId, percent: number): Promise<{ code: string }> {
  for (let i = 0; i < 5; i++) {
    const code = `WELCOME-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
    try {
      return await Coupon.create({ code, type: "percentage", value: percent, maxUses: 1, allowedUsers: [userId], kind: "welcome" });
    } catch (e: unknown) {
      if ((e as { code?: number }).code !== 11000) throw e; // collision de code → on réessaie
    }
  }
  throw new AppError("Impossible de générer le code de bienvenue", 500, "INTERNAL");
}
