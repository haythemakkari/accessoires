import { NextResponse } from "next/server";
import { api, assertSameOrigin, clientIp, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { Message } from "@/models/Message";
import { contactMessageSchema } from "@/validation/schemas";
import { createExchangeRequest } from "@/services/exchange.service";

export const POST = api(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  const { website, kind, ...data } = await parseBody(req, contactMessageSchema);
  void website; // si un robot a rempli le champ piège, le schéma a déjà rejeté la requête
  if (kind === "exchange") {
    // Client connecté : la demande est rattachée à son compte (suivi dans « Mon compte »). Un admin n'a pas de demandes.
    const user = await getCurrentUser();
    await createExchangeRequest(data, { userId: user && user.role === "customer" ? user.id : null, ip });
  } else {
    await Message.create({ ...data, ip });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
});
