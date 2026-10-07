import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { api, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";

const MAX = 25 * 1024 * 1024; // 25 Mo : une vidéo d'accueil courte (5–15 s) pèse typiquement 2 à 10 Mo
const MP4_BRANDS = ["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash", "M4V "];

/** Détecte le format réel par signature (le type MIME envoyé par le navigateur est falsifiable). */
function detectVideoExt(b: Buffer): "mp4" | "webm" | null {
  if (b.length > 16 && b.toString("ascii", 4, 8) === "ftyp" && MP4_BRANDS.includes(b.toString("ascii", 8, 12))) return "mp4";
  if (b.length > 16 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm";
  return null;
}

export const POST = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new AppError("Fichier vidéo attendu");
  if (file.size > MAX) throw new AppError(`Vidéo trop lourde (${Math.round(file.size / 1048576)} Mo) : 25 Mo maximum. Choisissez une vidéo plus courte ou compressée.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectVideoExt(buf);
  if (!ext) throw new AppError("Format non supporté : utilisez une vidéo MP4 (H.264) ou WebM.");
  const dir = path.join(process.cwd(), "public", "uploads", "videos");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), buf);
  return { url: `/media/video/${name}`, size: buf.length };
});
