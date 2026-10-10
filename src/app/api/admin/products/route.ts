import { NextResponse } from "next/server";
import { api, assertSameOrigin, parseBody, parseQuery } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { toSlug } from "@/lib/utils";
import { toPackagingDocs } from "@/lib/packaging";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { productListQuery, productSchema } from "@/validation/schemas";
import { generateSku, listProducts, uniqueSlug } from "@/services/product.service";

export const GET = api(async (req) => {
  await requireAdmin();
  return listProducts(parseQuery(req, productListQuery), { includeInactive: true });
});

export const POST = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, productSchema);
  if (!(await Category.exists({ _id: data.category }))) throw new AppError("Catégorie inexistante");
  try {
    const p = await Product.create({ ...data, packagings: toPackagingDocs(data.packagings), sku: data.sku ?? (await generateSku()), slug: await uniqueSlug(toSlug(data.name)) });
    return NextResponse.json(p, { status: 201 });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Ce SKU existe déjà", 409, "DUPLICATE_SKU");
    throw e;
  }
});
