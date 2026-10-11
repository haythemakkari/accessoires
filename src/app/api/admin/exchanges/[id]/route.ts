import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { exchangePatchSchema } from "@/validation/schemas";
import { Message } from "@/models/Message";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  return id;
};

/** Changer le statut (à traiter / répondue / clôturée) ou marquer lue. */
export const PATCH = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, exchangePatchSchema);
  const m = await Message.findOneAndUpdate({ _id: validId((await params).id), kind: "exchange" }, { $set: data }, { returnDocument: "after" });
  if (!m) throw notFound();
  return { ok: true, status: m.status, isRead: m.isRead };
});

export const DELETE = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  if (!(await Message.findOneAndDelete({ _id: validId((await params).id), kind: "exchange" }))) throw notFound();
  return { ok: true };
});
