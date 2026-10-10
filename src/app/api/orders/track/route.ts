import { z } from "zod";
import { api, assertSameOrigin, clientIp, parseBody } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/utils";
import { parseTunisianPhone, PHONE_ERROR } from "@/lib/phone";
import { Order } from "@/models/Order";

const schema = z.object({ orderNumber: z.string().trim().toUpperCase().regex(/^NM-\d{6}-[A-F0-9]{6}$/, "Numéro de commande invalide"), phone: z.string().trim().refine((v) => parseTunisianPhone(v) !== null, PHONE_ERROR).transform((v) => parseTunisianPhone(v)!) });

/** Suivi public : exige le numéro de commande ET le téléphone de la commande. Ne renvoie aucune donnée personnelle. */
export const POST = api(async (req) => {
  assertSameOrigin(req);
  rateLimit(`track:${clientIp(req)}`, 15, 15 * 60 * 1000);
  const { orderNumber, phone } = await parseBody(req, schema);
  const o = await Order.findOne({ orderNumber }).lean();
  if (!o || (parseTunisianPhone(o.customer?.phone ?? "") ?? normalizePhone(o.customer?.phone ?? "")) !== phone) throw new AppError("Aucune commande ne correspond à ces informations", 404, "NOT_FOUND");
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    total: o.total,
    items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, variant: i.variant, packaging: i.packaging?.name })),
    history: o.statusHistory.map((h) => ({ status: h.status, at: h.at })),
  };
});
