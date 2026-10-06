import { api, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError, notFound } from "@/lib/errors";
import { Message } from "@/models/Message";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  return id;
};

export const PATCH = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { isRead } = (await req.json()) as { isRead?: unknown };
  if (typeof isRead !== "boolean") throw new AppError("isRead booléen requis");
  const m = await Message.findByIdAndUpdate(validId((await params).id), { isRead }, { returnDocument: "after" });
  if (!m) throw notFound();
  return { ok: true };
});

export const DELETE = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  if (!(await Message.findByIdAndDelete(validId((await params).id)))) throw notFound();
  return { ok: true };
});
