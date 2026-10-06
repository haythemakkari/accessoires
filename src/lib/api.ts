import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError } from "./errors";
import { connectDB } from "./db";
import { bustCatalog } from "./data";

type Handler<C> = (req: Request, ctx: C) => Promise<Response | object>;

/** Enveloppe d'API : connexion DB, gestion d'erreurs uniforme, pas de fuite d'info interne. */
export function api<C = { params: Promise<Record<string, string>> }>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      await connectDB();
      const out = await handler(req, ctx);
      // Toute mutation admin du catalogue invalide le cache des pages publiques.
      if (req.method !== "GET" && /\/api\/admin\/(products|categories|settings)/.test(new URL(req.url).pathname)) bustCatalog();
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      if (e instanceof AppError) {
        return NextResponse.json({ error: e.message, code: e.code, details: e.details }, { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: e.issues[0]?.message ?? "Données invalides", code: "VALIDATION", details: e.flatten().fieldErrors },
          { status: 422 },
        );
      }
      console.error("[api]", e);
      return NextResponse.json({ error: "Erreur interne du serveur", code: "INTERNAL" }, { status: 500 });
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError("Corps de requête JSON invalide");
  }
  return schema.parse(json);
}

export function parseQuery<S extends ZodTypeAny>(req: Request, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Garde CSRF : les mutations doivent provenir de la même origine. */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  if (new URL(origin).host !== host) throw new AppError("Origine non autorisée", 403, "CSRF");
}
