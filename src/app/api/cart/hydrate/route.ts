import { api, clientIp, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { cartRefsSchema } from "@/validation/schemas";
import { hydrateCart } from "@/services/cart.service";

/** Met à jour des lignes de panier (prix, stock, photo, disponibilité) : public, pour le panier du navigateur. */
export const POST = api(async (req) => {
  rateLimit(`cart-hydrate:${clientIp(req)}`, 60, 60 * 1000);
  const { items } = await parseBody(req, cartRefsSchema);
  return { lines: await hydrateCart(items) };
});
