import { randomBytes } from "crypto";
import { Types } from "mongoose";
import { Product } from "@/models/Product";
import { Order, type OrderStatus } from "@/models/Order";
import { Coupon } from "@/models/Coupon";
import { AppError, notFound } from "@/lib/errors";
import { effectivePrice, round2 } from "@/lib/utils";
import { assertCouponUsable, redeemCoupon, releaseCoupon } from "./coupon.service";
import { computeDiscount, computeTotals } from "./pricing";
import { getSettings } from "./settings.service";
import { imageForVariantString } from "@/lib/variants";

export type CartInput = { productId: string; quantity: number; variant?: string }[];

/** Relit les produits en base : les prix et le stock envoyés par le client ne sont jamais utilisés. */
export async function priceCart(items: CartInput) {
  const merged = new Map<string, { productId: string; quantity: number; variant?: string }>();
  for (const it of items) {
    const key = `${it.productId}|${it.variant ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + it.quantity } : { ...it });
  }
  const lines = [...merged.values()];
  const products = await Product.find({ _id: { $in: lines.map((l) => l.productId) }, isActive: true });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const priced = lines.map((l) => {
    const p = byId.get(l.productId);
    if (!p) throw new AppError("Un produit de votre panier n'est plus disponible", 422, "PRODUCT_UNAVAILABLE");
    if (p.variants.length > 0) {
      const chosen = (l.variant ?? "").split(" / ");
      const valid = p.variants.length === chosen.length && p.variants.every((v, i) => v.options.includes(chosen[i]));
      if (!valid) throw new AppError(`Choisissez une option valide pour « ${p.name} »`, 422, "VARIANT_INVALID");
    }
    return { product: p, quantity: l.quantity, variant: l.variant, price: effectivePrice(p) };
  });

  // Le stock est partagé entre variantes d'un même produit.
  const qtyByProduct = new Map<string, number>();
  for (const l of priced) qtyByProduct.set(String(l.product._id), (qtyByProduct.get(String(l.product._id)) ?? 0) + l.quantity);
  for (const [id, qty] of qtyByProduct) {
    const p = byId.get(id)!;
    if (p.stock < qty) {
      throw new AppError(p.stock === 0 ? `« ${p.name} » est en rupture de stock` : `Stock insuffisant pour « ${p.name} » (${p.stock} restant)`, 409, "OUT_OF_STOCK");
    }
  }
  const subtotal = round2(priced.reduce((s, l) => s + l.price * l.quantity, 0));
  return { lines: priced, subtotal, qtyByProduct };
}

async function generateOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 5; i++) {
    const n = `NM-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!(await Order.exists({ orderNumber: n }))) return n;
  }
  throw new AppError("Impossible de générer le numéro de commande", 500, "INTERNAL");
}

export async function previewCart(items: CartInput, couponCode: string | undefined, userId: string | null) {
  const { subtotal } = await priceCart(items);
  let discount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
    if (!coupon) throw new AppError("Code promo invalide", 422, "COUPON_INVALID");
    assertCouponUsable(coupon, userId, subtotal);
    discount = computeDiscount(coupon, subtotal);
  }
  return computeTotals(subtotal, discount, await getSettings());
}

type CheckoutInput = {
  customer: { fullName: string; phone: string; email?: string };
  address: { line: string; city: string; district?: string; postalCode?: string; notes?: string };
  items: CartInput;
  couponCode?: string;
};

export async function createOrder(input: CheckoutInput, userId: string | null) {
  const { lines, subtotal, qtyByProduct } = await priceCart(input.items);

  let couponDoc = null;
  let discount = 0;
  if (input.couponCode) {
    couponDoc = await Coupon.findOne({ code: input.couponCode.trim().toUpperCase() });
    if (!couponDoc) throw new AppError("Code promo invalide", 422, "COUPON_INVALID");
    assertCouponUsable(couponDoc, userId, subtotal);
    discount = computeDiscount(couponDoc, subtotal);
  }
  const totals = computeTotals(subtotal, discount, await getSettings()); // frais de livraison lus en base à chaque commande

  // 1) Réserver le coupon (atomique), 2) décrémenter le stock (atomique, conditionnel), 3) créer la commande.
  // Toute erreur annule les étapes précédentes (compensation, sans nécessiter de replica set).
  let couponRedeemed = false;
  const decremented: [string, number][] = [];
  try {
    if (couponDoc) {
      await redeemCoupon(couponDoc._id);
      couponRedeemed = true;
    }
    for (const [id, qty] of qtyByProduct) {
      const res = await Product.updateOne({ _id: id, isActive: true, stock: { $gte: qty } }, { $inc: { stock: -qty, soldCount: qty } });
      if (res.modifiedCount !== 1) {
        const p = lines.find((l) => String(l.product._id) === id)!.product;
        throw new AppError(`Stock insuffisant pour « ${p.name} »`, 409, "OUT_OF_STOCK");
      }
      decremented.push([id, qty]);
    }
    const doc = {
      orderNumber: "",
      user: userId ? new Types.ObjectId(userId) : null,
      isGuest: !userId,
      customer: input.customer,
      address: input.address,
      items: lines.map((l) => ({
        product: l.product._id,
        name: l.product.name,
        sku: l.product.sku,
        image: imageForVariantString(l.product.variants, l.variant) ?? l.product.images[0], // photo de la couleur commandée
        price: l.price,
        quantity: l.quantity,
        variant: l.variant,
      })),
      ...totals,
      coupon: couponDoc ? { id: couponDoc._id, code: couponDoc.code } : undefined,
      statusHistory: [{ status: "pending" }],
    };
    // Collision de numéro (rarissime, index unique) : on retente avec un nouveau numéro.
    let order;
    for (let attempt = 0; ; attempt++) {
      try {
        order = await Order.create({ ...doc, orderNumber: await generateOrderNumber() });
        break;
      } catch (e) {
        if ((e as { code?: number }).code !== 11000 || attempt >= 3) throw e;
      }
    }
    return order;
  } catch (e) {
    await Promise.allSettled(decremented.map(([id, qty]) => Product.updateOne({ _id: id }, { $inc: { stock: qty, soldCount: -qty } })));
    if (couponRedeemed && couponDoc) await releaseCoupon(couponDoc._id, couponDoc.kind === "welcome");
    throw e;
  }
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
  confirmed: ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound("Commande introuvable");
  if (order.status === status) return order;
  if (!TRANSITIONS[order.status].includes(status)) {
    throw new AppError(`Transition impossible : ${order.status} → ${status}`, 422, "BAD_TRANSITION");
  }
  // Mise à jour conditionnelle : évite une double annulation concurrente.
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: order.status },
    { status, $push: { statusHistory: { status, at: new Date() } } },
    { returnDocument: "after" },
  );
  if (!updated) throw new AppError("La commande a été modifiée entre-temps, rechargez", 409, "CONFLICT");

  if (status === "cancelled") {
    const claimed = await Order.findOneAndUpdate({ _id: orderId, stockRestored: false }, { stockRestored: true }, { returnDocument: "after" });
    if (claimed) {
      await Promise.all(updated.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity, soldCount: -i.quantity } })));
      if (updated.coupon?.id) {
        const c = await Coupon.findById(updated.coupon.id);
        if (c) await releaseCoupon(c._id, c.kind === "welcome");
      }
    }
  }
  return updated;
}
