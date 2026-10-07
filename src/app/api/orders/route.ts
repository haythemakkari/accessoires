import { NextResponse } from "next/server";
import { api, assertSameOrigin, clientIp, parseBody } from "@/lib/api";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { forbidden } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { plain } from "@/lib/utils";
import { Order } from "@/models/Order";
import { checkoutSchema } from "@/validation/schemas";
import { createOrder } from "@/services/order.service";
import { clearStoredCart } from "@/services/cart.service";

export const POST = api(async (req) => {
  assertSameOrigin(req);
  rateLimit(`order:${clientIp(req)}`, 10, 60 * 60 * 1000);
  const data = await parseBody(req, checkoutSchema);
  const user = await getCurrentUser(); // optionnel : commande invité autorisée
  if (user?.role === "admin") throw forbidden("Un compte administrateur ne peut pas passer de commande");
  const order = await createOrder(data, user ? user.id : null);
  if (user) await clearStoredCart(user.id); // la commande est passée : le panier du compte est vidé
  return NextResponse.json({ orderNumber: order.orderNumber, id: order.id, total: order.total, isGuest: order.isGuest }, { status: 201 });
});

export const GET = api(async () => {
  const user = await requireUser();
  return plain(await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(100).lean());
});
