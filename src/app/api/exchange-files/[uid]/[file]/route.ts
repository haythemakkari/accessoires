import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { CONTENT_TYPES } from "@/lib/exchange-files";
import { readUpload, statUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UID = /^[a-f\d]{24}$/i;
const FILE = /^[\w-]+\.(webp|webm|ogg|mp4|mp3|wav)$/i;

/**
 * Lecture d'une pièce jointe d'une demande d'échange. PRIVÉE : seul le client propriétaire du dossier et l'administrateur y accèdent.
 * Gère les requêtes « Range » (nécessaires à la lecture audio sur iPhone / Safari).
 */
export async function GET(req: Request, { params }: { params: Promise<{ uid: string; file: string }> }) {
  const { uid, file } = await params;
  if (!UID.test(uid) || !FILE.test(file)) return new Response("Not found", { status: 404 });
  await connectDB();
  const user = await getCurrentUser();
  if (!user) return new Response("Connexion requise", { status: 401, headers: { "Cache-Control": "no-store" } });
  if (user.role !== "admin" && user.id !== uid) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } }); // on ne révèle pas l'existence du fichier

  const rel = `exchange/${uid}/${file}`;
  const stored = await statUpload(rel);
  if (!stored) return new Response("Not found", { status: 404 });
  const buf = await readUpload(rel, stored);
  const size = buf.length;
  const type = CONTENT_TYPES[file.split(".").pop()!.toLowerCase()];
  const base = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store", // fichiers privés : jamais gardés dans le cache du navigateur (ordinateur partagé)
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": "inline",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] !== "" || range[2] !== "")) {
    let start = range[1] === "" ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] === "" || range[2] === "" ? size - 1 : Number(range[2]);
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
    return new Response(new Uint8Array(buf.subarray(start, end + 1)), { status: 206, headers: { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(new Uint8Array(buf), { headers: { ...base, "Content-Length": String(size) } });
}
