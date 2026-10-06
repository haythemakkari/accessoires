import { NextResponse } from "next/server";
import { api, assertSameOrigin, clientIp, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/validation/schemas";
import { registerCustomer } from "@/services/auth.service";
import { setSessionCookie, signSession } from "@/lib/auth";

export const POST = api(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  const data = await parseBody(req, registerSchema);
  const user = await registerCustomer(data, ip);
  await setSessionCookie(await signSession(user));
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, welcomeCoupon: user.welcomeCouponCode }, { status: 201 });
});
