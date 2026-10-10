import { api } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { plain, withPrice } from "@/lib/utils";
import { publicProduct } from "@/lib/packaging";
import { Product } from "@/models/Product";

export const GET = api<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  const p = await Product.findOne({ slug, isActive: true }).populate("category", "name slug").lean();
  if (!p) throw notFound("Produit introuvable");
  return publicProduct(withPrice(plain(p)));
});
