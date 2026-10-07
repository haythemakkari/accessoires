import { z } from "zod";
import { api, parseQuery } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { plain } from "@/lib/utils";
import { Order } from "@/models/Order";

/** Compte client = identifiant utilisateur ; invité = numéro de téléphone (les invités sont regroupés par téléphone). */
const query = z.object({
  type: z.enum(["registered", "guest"]),
  id: z.string().trim().min(1).max(40),
});

export const GET = api(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, query);
  const filter = q.type === "registered"
    ? /^[a-f\d]{24}$/i.test(q.id) ? { user: q.id } : null
    : { isGuest: true, "customer.phone": q.id };
  if (!filter) return { items: [], cancelled: 0 };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200)
    .select("orderNumber status total createdAt items.quantity").lean();
  const items = orders.map((o) => ({
    id: String(o._id), orderNumber: o.orderNumber, status: o.status, total: o.total, createdAt: o.createdAt,
    units: o.items.reduce((n, i) => n + i.quantity, 0),
  }));
  return plain({ items, cancelled: items.filter((o) => o.status === "cancelled").length });
});
