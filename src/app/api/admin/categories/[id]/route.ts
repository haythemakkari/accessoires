import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError, notFound } from "@/lib/errors";
import { toSlug } from "@/lib/utils";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { categorySchema } from "@/validation/schemas";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  return id;
};

export const PUT = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, categorySchema);
  try {
    const c = await Category.findByIdAndUpdate(validId((await params).id), { ...data, slug: toSlug(data.name) }, { returnDocument: "after" });
    if (!c) throw notFound();
    return c;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Une catégorie avec ce nom existe déjà", 409);
    throw e;
  }
});

export const DELETE = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const id = validId((await params).id);
  if (await Product.exists({ category: id })) throw new AppError("Cette catégorie contient des produits : déplacez-les ou désactivez-la", 409, "CATEGORY_NOT_EMPTY");
  if (!(await Category.findByIdAndDelete(id))) throw notFound();
  return { ok: true };
});
