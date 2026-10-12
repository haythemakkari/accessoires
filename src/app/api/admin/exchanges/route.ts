import { z } from "zod";
import { api, assertSameOrigin, parseBody, parseQuery } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { plain } from "@/lib/utils";
import { messageBulkSchema } from "@/validation/schemas";
import { Message } from "@/models/Message";
import { deleteExchangeFiles } from "@/services/exchange.service";

const query = z.object({
  status: z.enum(["open", "answered", "closed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Demandes d'échange (séparées des autres messages), les plus récentes d'abord. */
export const GET = api(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, query);
  const base = { kind: "exchange" as const };
  const filter = q.status ? { ...base, status: q.status } : base;
  const [items, total, unread, open] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Message.countDocuments(filter),
    Message.countDocuments({ ...base, isRead: false }),
    Message.countDocuments({ ...base, status: "open" }),
  ]);
  return { items: plain(items), total, unread, open, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
});

/** Suppression groupée (100 max), limitée aux demandes d'échange. */
export const DELETE = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { ids } = await parseBody(req, messageBulkSchema);
  const filter = { kind: "exchange" as const, _id: { $in: [...new Set(ids)] } };
  const docs = await Message.find(filter).select("replies").lean();
  const res = await Message.deleteMany(filter);
  await deleteExchangeFiles(docs); // photos et vocaux des demandes supprimées
  return { ok: true, deleted: res.deletedCount };
});
