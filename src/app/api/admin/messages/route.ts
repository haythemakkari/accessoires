import { z } from "zod";
import { api, assertSameOrigin, parseBody, parseQuery } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { messageBulkSchema } from "@/validation/schemas";
import { requireAdmin } from "@/lib/auth";
import { plain } from "@/lib/utils";
import { Message } from "@/models/Message";

const query = z.object({ unread: z.enum(["true"]).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

export const GET = api(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, query);
  // Les demandes d'échange ont leur propre page : elles ne figurent pas ici.
  const filter = { kind: { $ne: "exchange" as const }, ...(q.unread ? { isRead: false } : {}) };
  const [items, total, unread] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Message.countDocuments(filter),
    Message.countDocuments({ kind: { $ne: "exchange" }, isRead: false }),
  ]);
  return { items: plain(items), total, unread, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
});

/** Suppression groupée : { ids: [...] } (100 max). */
export const DELETE = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { ids } = await parseBody(req, messageBulkSchema);
  const res = await Message.deleteMany({ kind: { $ne: "exchange" }, _id: { $in: [...new Set(ids)] } });
  return { ok: true, deleted: res.deletedCount };
});

/** Marquage groupé lu / non lu : { ids: [...], isRead: boolean }. */
export const PATCH = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { ids, isRead } = await parseBody(req, messageBulkSchema);
  if (typeof isRead !== "boolean") throw new AppError("isRead booléen requis");
  const res = await Message.updateMany({ kind: { $ne: "exchange" }, _id: { $in: [...new Set(ids)] } }, { isRead });
  return { ok: true, updated: res.modifiedCount };
});
