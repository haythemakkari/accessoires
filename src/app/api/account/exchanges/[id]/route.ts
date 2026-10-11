import { api, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { markExchangeSeen } from "@/services/exchange.service";

type Ctx = { params: Promise<{ id: string }> };

/** Le client a ouvert sa demande : les nouvelles réponses ne sont plus signalées comme non lues. */
export const PATCH = api<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound();
  await markExchangeSeen(user.id, id);
  return { ok: true };
});
