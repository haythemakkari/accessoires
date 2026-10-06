import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { plain } from "@/lib/utils";
import { Order } from "@/models/Order";

export const GET = api<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  const order = await Order.findOne({ _id: id, user: user._id }).lean(); // filtre par propriétaire
  if (!order) throw notFound("Commande introuvable");
  return plain(order);
});
