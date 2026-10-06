import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError, notFound } from "@/lib/errors";
import { Coupon } from "@/models/Coupon";
import { couponSchema } from "@/validation/schemas";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  return id;
};

export const PUT = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, couponSchema);
  try {
    const c = await Coupon.findByIdAndUpdate(validId((await params).id), data, { returnDocument: "after" });
    if (!c) throw notFound();
    return c;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Ce code existe déjà", 409);
    throw e;
  }
});

export const PATCH = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { isActive } = (await req.json()) as { isActive?: unknown };
  if (typeof isActive !== "boolean") throw new AppError("isActive booléen requis");
  const c = await Coupon.findByIdAndUpdate(validId((await params).id), { isActive }, { returnDocument: "after" });
  if (!c) throw notFound();
  return c;
});

export const DELETE = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  if (!(await Coupon.findByIdAndDelete(validId((await params).id)))) throw notFound();
  return { ok: true };
});
