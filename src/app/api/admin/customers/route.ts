import { z } from "zod";
import { api, parseQuery } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { escapeRegex } from "@/lib/utils";
import { Order } from "@/models/Order";
import { User } from "@/models/User";

const query = z.object({
  type: z.enum(["registered", "guest"]).default("registered"),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = api(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, query);
  const skip = (q.page - 1) * q.limit;
  const rx = q.q ? new RegExp(escapeRegex(q.q), "i") : null;
  const valid = { status: { $ne: "cancelled" } };

  if (q.type === "registered") {
    const filter: Record<string, unknown> = { role: "customer", ...(rx && { $or: [{ name: rx }, { email: rx }, { phone: rx }] }) };
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      User.countDocuments(filter),
    ]);
    const agg = await Order.aggregate([
      { $match: { user: { $in: users.map((u) => u._id) } } },
      { $group: { _id: "$user", orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$total", 0] } }, lastOrder: { $max: "$createdAt" } } },
    ]);
    const m = new Map(agg.map((a) => [String(a._id), a]));
    const items = users.map((u) => ({
      id: String(u._id), name: u.name, email: u.email, phone: u.phone ?? "", createdAt: u.createdAt, isActive: u.isActive,
      orders: m.get(String(u._id))?.orders ?? 0, spent: m.get(String(u._id))?.spent ?? 0, lastOrder: m.get(String(u._id))?.lastOrder ?? null,
    }));
    return { items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
  }

  // Invités : regroupés par téléphone.
  const match = { isGuest: true, ...(rx && { $or: [{ "customer.fullName": rx }, { "customer.phone": rx }, { "customer.email": rx }] }) };
  const [rows, count] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$customer.phone", name: { $first: "$customer.fullName" }, email: { $first: "$customer.email" }, orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$total", 0] } }, lastOrder: { $max: "$createdAt" }, createdAt: { $min: "$createdAt" } } },
      { $sort: { lastOrder: -1 } }, { $skip: skip }, { $limit: q.limit },
    ]),
    Order.aggregate([{ $match: match }, { $group: { _id: "$customer.phone" } }, { $count: "n" }]),
  ]);
  void valid;
  const total = count[0]?.n ?? 0;
  return {
    items: rows.map((r) => ({ id: r._id, name: r.name, email: r.email ?? "", phone: r._id, createdAt: r.createdAt, orders: r.orders, spent: r.spent, lastOrder: r.lastOrder })),
    total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)),
  };
});
