import type { QueryFilter } from "mongoose";
import { z } from "zod";
import { api, parseQuery } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { escapeRegex, plain } from "@/lib/utils";
import { Order, ORDER_STATUSES } from "@/models/Order";

const query = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  guest: z.enum(["true", "false"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = api(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, query);
  const filter: QueryFilter<any> = {};
  if (q.status) filter.status = q.status;
  if (q.guest) filter.isGuest = q.guest === "true";
  if (q.from || q.to) filter.createdAt = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: new Date(q.to.getTime() + 86399999) }) };
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    filter.$or = [{ orderNumber: rx }, { "customer.fullName": rx }, { "customer.phone": rx }, { "customer.email": rx }];
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { items: plain(items), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
});
