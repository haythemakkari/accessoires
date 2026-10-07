import { createHash } from "crypto";
import { stat } from "fs/promises";
import path from "path";
import { DEFAULT_MEDIA_WIDTH, MEDIA_WIDTHS } from "@/lib/media";
import { UPLOAD_DIR, getVariant, pickFormat } from "@/lib/media-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME = /^[\w.\-]+\.(jpe?g|png|webp|avif)$/i; // pas de « / » ni de « .. » : aucun chemin arbitraire

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!NAME.test(name)) return new Response("Not found", { status: 404 });
  const w = new URL(req.url).searchParams.get("w");
  const width = w === null ? DEFAULT_MEDIA_WIDTH : Number(w);
  if (!(MEDIA_WIDTHS as readonly number[]).includes(width)) return new Response("Largeur non supportée", { status: 400 });

  let srcStat;
  try {
    srcStat = await stat(path.join(UPLOAD_DIR, name));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const format = pickFormat(req.headers.get("accept"));
  const etag = `"${createHash("sha1").update(`${name}:${width}:${format}:${srcStat.mtimeMs}:${srcStat.size}`).digest("hex").slice(0, 20)}"`;
  // Vary: Accept → un CDN garde une version AVIF et une version WebP séparées.
  const headers = { "Cache-Control": "public, max-age=31536000, immutable", ETag: etag, Vary: "Accept", "X-Content-Type-Options": "nosniff" };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  try {
    const buf = await getVariant(name, width, format, srcStat.mtimeMs);
    return new Response(new Uint8Array(buf), { headers: { ...headers, "Content-Type": `image/${format}`, "Content-Length": String(buf.length) } });
  } catch (e) {
    console.error("[media]", name, e);
    return new Response("Image illisible", { status: 422 });
  }
}
