import { NextResponse } from "next/server";
import { api, assertSameOrigin, clientIp, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { Message } from "@/models/Message";
import { contactMessageSchema } from "@/validation/schemas";

export const POST = api(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  const { website, ...data } = await parseBody(req, contactMessageSchema);
  void website; // si un robot a rempli le champ piège, le schéma a déjà rejeté la requête
  await Message.create({ ...data, ip });
  return NextResponse.json({ ok: true }, { status: 201 });
});
