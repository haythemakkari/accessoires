import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { deleteUpload, readUpload, statUpload } from "@/lib/storage";
import { VIDEO_SIGNATURE_BYTES, detectVideoExt } from "@/lib/video";
import { heroSettingsSchema } from "@/validation/schemas";
import { getSettings, updateSettings } from "@/services/settings.service";

const localVideoName = (url: string) => /^\/media\/video\/([\w\-]+\.(?:mp4|webm))$/i.exec(url)?.[1];

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, heroSettingsSchema);
  const before = await getSettings();
  const oldVideo = localVideoName(before.heroMediaUrl);
  const newVideo = data.heroMediaType === "video" ? localVideoName(data.heroMediaUrl) : undefined;

  // Nouvelle vidéo téléversée : elle doit exister et être une vraie vidéo (avec Vercel Blob, elle n'a pas encore été vérifiée côté serveur).
  if (newVideo && newVideo !== oldVideo) {
    const file = await statUpload(`videos/${newVideo}`);
    if (!file) throw new AppError("Vidéo introuvable : renvoyez-la", 422, "VALIDATION", { heroMediaUrl: ["Vidéo introuvable : renvoyez-la"] });
    if (!detectVideoExt(await readUpload(`videos/${newVideo}`, file, VIDEO_SIGNATURE_BYTES))) {
      await deleteUpload(`videos/${newVideo}`);
      throw new AppError("Format non supporté : utilisez une vidéo MP4 (H.264) ou WebM.", 422, "VALIDATION", { heroMediaUrl: ["Format non supporté (MP4 ou WebM)"] });
    }
  }
  const saved = await updateSettings(data);
  // Remplacement/retrait d'une vidéo téléversée : on supprime l'ancien fichier (lourd) pour ne pas encombrer le stockage.
  if (oldVideo && oldVideo !== localVideoName(saved.heroMediaUrl)) await deleteUpload(`videos/${oldVideo}`);
  return saved;
});
