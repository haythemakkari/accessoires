import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { forbidden } from "@/lib/errors";
import { cartPersistSchema } from "@/validation/schemas";
import { clearStoredCart, loadStoredCart, saveStoredCart } from "@/services/cart.service";

/** Panier du compte (client connecté) : retrouvé sur n'importe quel appareil. Un admin n'a pas de panier (il ne commande pas). */
async function customer() {
  const user = await requireUser();
  if (user.role !== "customer") throw forbidden("Un compte administrateur n'a pas de panier");
  return user;
}

export const GET = api(async () => loadStoredCart((await customer()).id));

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  const user = await customer();
  const { items, couponCode } = await parseBody(req, cartPersistSchema);
  await saveStoredCart(user.id, items, couponCode);
  return { ok: true };
});

export const DELETE = api(async (req) => {
  assertSameOrigin(req);
  await clearStoredCart((await customer()).id);
  return { ok: true };
});
