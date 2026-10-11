import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { plain } from "@/lib/utils";
import { exchangeReplySchema } from "@/validation/schemas";
import { addAdminReply } from "@/services/exchange.service";

type Ctx = { params: Promise<{ id: string }> };

/** Réponse de l'admin au client : visible dans « Mon compte » du client. */
export const POST = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  const { text } = await parseBody(req, exchangeReplySchema);
  return plain(await addAdminReply(id, text));
});
