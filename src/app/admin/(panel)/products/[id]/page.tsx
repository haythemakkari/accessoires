import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { plain, withPrice } from "@/lib/utils";
import { Product } from "@/models/Product";
import type { ProductDTO } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Modifier le produit" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  await connectDB();
  const p = await Product.findById(id).lean();
  if (!p) notFound();
  return <ProductForm product={withPrice(plain(p)) as unknown as ProductDTO} />;
}
