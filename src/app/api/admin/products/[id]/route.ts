import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError, notFound } from "@/lib/errors";
import { toSlug } from "@/lib/utils";
import { Product } from "@/models/Product";
import { productPatchSchema, productSchema } from "@/validation/schemas";
import { generateSku, uniqueSlug } from "@/services/product.service";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  return id;
};

export const GET = api<Ctx>(async (_req, { params }) => {
  await requireAdmin();
  const p = await Product.findById(validId((await params).id));
  if (!p) throw notFound();
  return p;
});

export const PUT = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const id = validId((await params).id);
  const data = await parseBody(req, productSchema);
  const existing = await Product.findById(id);
  if (!existing) throw notFound();
  const slug = existing.name === data.name ? existing.slug : await uniqueSlug(toSlug(data.name), id);
  try {
    // SKU vide = on conserve l'existant (ou on en génère un si le produit n'en avait pas) ; jamais de SKU effacé.
    const sku = data.sku ?? existing.sku ?? (await generateSku());
    const updated = await Product.findByIdAndUpdate(id, { ...data, sku, slug }, { returnDocument: "after", runValidators: true });
    if (!updated) throw notFound();
    return updated;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Ce SKU existe déjà", 409, "DUPLICATE_SKU");
    throw e;
  }
});

/** Actions rapides : activer, vedette, stock, prix. */
export const PATCH = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, productPatchSchema);
  const p = await Product.findByIdAndUpdate(validId((await params).id), { $set: data }, { returnDocument: "after" });
  if (!p) throw notFound();
  return p;
});

export const DELETE = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const p = await Product.findByIdAndDelete(validId((await params).id));
  if (!p) throw notFound();
  return { ok: true };
});
