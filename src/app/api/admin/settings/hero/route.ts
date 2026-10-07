import { unlink } from "fs/promises";
import path from "path";
import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { heroSettingsSchema } from "@/validation/schemas";
import { getSettings, updateSettings } from "@/services/settings.service";

const VIDEO_DIR = path.join(process.cwd(), "public", "uploads", "videos");
const localVideoName = (url: string) => /^\/media\/video\/([\w\-]+\.(?:mp4|webm))$/i.exec(url)?.[1];

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const data = await parseBody(req, heroSettingsSchema);
  const before = await getSettings();
  const saved = await updateSettings(data);
  // Remplacement/retrait d'une vidéo téléversée : on supprime l'ancien fichier (lourd) pour ne pas encombrer le disque.
  const old = localVideoName(before.heroMediaUrl);
  if (old && old !== localVideoName(saved.heroMediaUrl)) await unlink(path.join(VIDEO_DIR, old)).catch(() => {});
  return saved;
});
