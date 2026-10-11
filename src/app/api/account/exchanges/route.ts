import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { plain } from "@/lib/utils";
import { toCustomerExchange } from "@/lib/exchange-dto";
import { customerExchanges } from "@/services/exchange.service";

/** Demandes d'échange du client connecté (et seulement les siennes). */
export const GET = api(async () => {
  const user = await requireUser();
  const items = plain(await customerExchanges(user.id)).map(toCustomerExchange);
  return { items, unread: items.filter((i) => i.unread).length };
});
