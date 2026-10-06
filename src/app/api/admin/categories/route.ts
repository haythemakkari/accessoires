import { NextResponse } from "next/server";
import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { plain, toSlug } from "@/lib/utils";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { categorySchema } from "@/validation/schemas";

export const GET = api(async () => {
  await requireAdmin();
  const [cats, counts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Product.aggregate([{ $group: { _id: "$category", n: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  return plain(cats.map((c) => ({ ...c, productCount: map.get(String(c._id)) ?? 0 })));
});

export const POST = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, categorySchema);
  try {
    return NextResponse.json(await Category.create({ ...data, slug: toSlug(data.name) }), { status: 201 });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Une catégorie avec ce nom existe déjà", 409);
    throw e;
  }
});
