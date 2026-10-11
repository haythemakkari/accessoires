import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { exchangeReplySchema } from "@/validation/schemas";
import { addCustomerReply } from "@/services/exchange.service";

type Ctx = { params: Promise<{ id: string }> };

/** Le client répond dans SA demande d'échange (conversation avec l'équipe). */
export const POST = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  rateLimit(`exchange-reply:${user.id}`, 20, 60 * 60 * 1000);
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  const { text } = await parseBody(req, exchangeReplySchema);
  if (!(await addCustomerReply(user.id, id, text))) throw notFound();
  return { ok: true };
});
