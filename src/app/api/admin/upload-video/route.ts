import { randomBytes } from "crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { api, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { saveUpload, VIDEO_BLOB_PATH } from "@/lib/storage";
import { MAX_VIDEO_BYTES, detectVideoExt } from "@/lib/video";

/**
 * Deux modes :
 *  - Vercel Blob : le navigateur envoie la vidéo DIRECTEMENT au stockage (Vercel refuse les requêtes de plus de 4,5 Mo) ;
 *    cette route ne fait que délivrer l'autorisation (JSON). Le format réel est vérifié à l'enregistrement (api/admin/settings/hero).
 *  - Disque local : envoi classique (multipart) vérifié ici.
 */
export const POST = api(async (req) => {
  assertSameOrigin(req);
  if (req.headers.get("content-type")?.includes("application/json")) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new AppError("Envoi de vidéo indisponible : ajoutez BLOB_READ_WRITE_TOKEN au projet Vercel (Storage → store Blob → connexion avec jeton lecture-écriture).", 400);
    const body = (await req.json()) as HandleUploadBody;
    return Response.json(
      await handleUpload({
        request: req,
        body,
        onBeforeGenerateToken: async (pathname) => {
          await requireAdmin();
          if (!VIDEO_BLOB_PATH.test(pathname)) throw new AppError("Nom de fichier invalide");
          return { allowedContentTypes: ["video/mp4", "video/webm"], maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: false };
        },
      }),
    );
  }

  await requireAdmin();
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw new AppError("Fichier vidéo attendu");
  if (file.size > MAX_VIDEO_BYTES) throw new AppError(`Vidéo trop lourde (${Math.round(file.size / 1048576)} Mo) : 25 Mo maximum. Choisissez une vidéo plus courte ou compressée.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectVideoExt(buf);
  if (!ext) throw new AppError("Format non supporté : utilisez une vidéo MP4 (H.264) ou WebM.");
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await saveUpload(`videos/${name}`, buf, ext === "webm" ? "video/webm" : "video/mp4");
  return { url: `/media/video/${name}`, size: buf.length };
});
