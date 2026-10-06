import { z } from "zod";
import { api, parseQuery } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { plain } from "@/lib/utils";
import { Message } from "@/models/Message";

const query = z.object({ unread: z.enum(["true"]).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

export const GET = api(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, query);
  const filter = q.unread ? { isRead: false } : {};
  const [items, total, unread] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Message.countDocuments(filter),
    Message.countDocuments({ isRead: false }),
  ]);
  return { items: plain(items), total, unread, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
});
