import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { api, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";

/** Détecte le vrai format via la signature des premiers octets (le type MIME envoyé par le client est falsifiable). */
function detectImageExt(b: Buffer): string | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (b.length > 12 && b.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(b.toString("ascii", 8, 12))) return "avif";
  return null;
}
const MAX = 5 * 1024 * 1024;

/** Stockage local (public/uploads). En production, remplacer par S3/Cloudinary derrière la même route. */
export const POST = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length || files.length > 10) throw new AppError("1 à 10 fichiers attendus");
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const urls: string[] = [];
  for (const f of files) {
    if (f.size > MAX) throw new AppError("Image trop lourde (5 Mo max)");
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = detectImageExt(buf);
    if (!ext) throw new AppError("Format non supporté (jpg, png, webp, avif)");
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    await writeFile(path.join(dir, name), buf);
    urls.push(`/uploads/${name}`);
  }
  return { urls };
});
