import { NextResponse } from "next/server";
import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { plain } from "@/lib/utils";
import { Coupon } from "@/models/Coupon";
import { couponSchema } from "@/validation/schemas";

export const GET = api(async (req) => {
  await requireAdmin();
  const kind = new URL(req.url).searchParams.get("kind");
  const filter: Record<string, unknown> = kind === "welcome" || kind === "standard" ? { kind } : {};
  return plain(await Coupon.find(filter).sort({ createdAt: -1 }).limit(300).lean());
});

export const POST = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, couponSchema);
  try {
    return NextResponse.json(await Coupon.create({ ...data, kind: "standard" }), { status: 201 });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Ce code existe déjà", 409);
    throw e;
  }
});
