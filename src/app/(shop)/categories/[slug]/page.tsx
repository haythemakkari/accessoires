import { redirect } from "next/navigation";

export default async function CategoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  redirect(`/products?category=${encodeURIComponent((await params).slug)}`);
}
