import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { plain } from "@/lib/utils";
import { Order } from "@/models/Order";
import { orderStatusSchema } from "@/validation/schemas";
import { updateOrderStatus } from "@/services/order.service";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  return id;
};

export const GET = api<Ctx>(async (_req, { params }) => {
  await requireAdmin();
  const o = await Order.findById(validId((await params).id)).populate("user", "name email").lean();
  if (!o) throw notFound();
  return plain(o);
});

export const PATCH = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { status } = await parseBody(req, orderStatusSchema);
  return plain((await updateOrderStatus(validId((await params).id), status)).toObject());
});
