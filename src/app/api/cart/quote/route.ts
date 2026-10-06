import { z } from "zod";
import { api, clientIp, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { cartItemSchema } from "@/validation/schemas";
import { previewCart } from "@/services/order.service";

const schema = z.object({ items: z.array(cartItemSchema).min(1).max(50), couponCode: z.string().trim().max(40).optional() });

/** Recalcule le panier côté serveur (prix, stock, coupon, livraison). */
export const POST = api(async (req) => {
  rateLimit(`quote:${clientIp(req)}`, 120, 60 * 1000); // route publique qui lit la base : plafond généreux contre les abus
  const { items, couponCode } = await parseBody(req, schema);
  const user = await getCurrentUser();
  return previewCart(items, couponCode || undefined, user ? user.id : null);
});
