import { randomBytes } from "crypto";
import sharp from "sharp";
import { api, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { AppError, forbidden } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { ATTACHMENT_NAME, CONTENT_TYPES, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, detectAudioExt, detectImageExt } from "@/lib/exchange-files";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { Message } from "@/models/Message";

/**
 * Dépôt d'UNE pièce jointe (photo ou message vocal) par le client connecté, avant l'envoi de son message.
 *  - le vrai format est vérifié sur les premiers octets (le type MIME du navigateur est falsifiable) ;
 *  - photo : orientation corrigée, 2000 px max, réencodée en WebP, métadonnées (GPS…) supprimées ;
 *  - le fichier est rangé dans le dossier privé du client et n'est lisible que par lui et par l'admin.
 */
export const POST = api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  if (user.role !== "customer") throw forbidden();
  rateLimit(`exchange-upload:${user.id}`, 40, 60 * 60 * 1000);
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new AppError("Fichier attendu");
  const buf = Buffer.from(await file.arrayBuffer());
  const stamp = `${Date.now()}-${randomBytes(6).toString("hex")}`;

  if (detectImageExt(buf)) {
    if (buf.length > MAX_IMAGE_BYTES) throw new AppError("Photo trop lourde (5 Mo maximum)");
    let optimized: Buffer;
    try {
      optimized = await sharp(buf, { limitInputPixels: 60_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    } catch {
      throw new AppError("Photo illisible ou corrompue");
    }
    const name = `${user.id}/${stamp}.webp`;
    await saveUpload(`exchange/${name}`, optimized, CONTENT_TYPES.webp);
    return { name, kind: "image", size: optimized.length };
  }

  const ext = detectAudioExt(buf);
  if (!ext) throw new AppError("Format non supporté : envoyez une photo (JPG, PNG, WebP) ou un message vocal enregistré");
  if (buf.length > MAX_AUDIO_BYTES) throw new AppError("Message vocal trop long (environ 2 minutes maximum)");
  if (buf.length < 1500) throw new AppError("Message vocal vide ou trop court");
  const name = `${user.id}/${stamp}.${ext}`;
  await saveUpload(`exchange/${name}`, buf, CONTENT_TYPES[ext]);
  return { name, kind: "audio", size: buf.length };
});

/** Le client retire une pièce jointe qu'il n'a pas (encore) envoyée : le fichier est supprimé du stockage. Impossible si elle est déjà dans un message. */
export const DELETE = api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  if (user.role !== "customer") throw forbidden();
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!ATTACHMENT_NAME.test(name) || !name.startsWith(`${user.id}/`)) throw new AppError("Pièce jointe invalide");
  if (await Message.exists({ "replies.attachments.name": name })) throw new AppError("Cette pièce jointe a déjà été envoyée", 409);
  await deleteUpload(`exchange/${name}`);
  return { ok: true };
});
