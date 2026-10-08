import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { UPLOAD_DIR, statUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME = /^[\w\-]+\.(mp4|webm)$/i;

/** Sert les vidéos avec prise en charge des requêtes « Range » (obligatoire pour la lecture sur iPhone/Safari et utile en 3G : lecture progressive). */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!NAME.test(name)) return new Response("Not found", { status: 404 });
  const stored = await statUpload(`videos/${name}`);
  if (!stored) return new Response("Not found", { status: 404 });
  // Vercel Blob : redirection vers son CDN, qui gère lui-même les requêtes « Range ».
  if (stored.url) return new Response(null, { status: 307, headers: { Location: stored.url, "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  const file = path.join(UPLOAD_DIR, "videos", name);
  const size = stored.size;
  const type = name.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] !== "" || range[2] !== "")) {
    let start = range[1] === "" ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] === "" || range[2] === "" ? size - 1 : Number(range[2]);
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { ...base, "Content-Length": String(size) } });
}
