"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImageIcon, Plus, Trash2, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, fetcher } from "@/lib/client/fetcher";
import { uploadImages, uploadVideo } from "@/lib/client/upload";
import { mediaUrl } from "@/lib/media";
import { HeroMedia, SLIDE_INTERVAL_MS } from "@/components/shop/HeroMedia";
import { PageHeader } from "./ui";

const MAX_IMAGES = 8;
type State = { heroMediaType: "none" | "image" | "video"; heroMediaUrl: string; heroPosterUrl: string; heroImages: string[]; heroAlt: string };
const EMPTY: State = { heroMediaType: "none", heroMediaUrl: "", heroPosterUrl: "", heroImages: [], heroAlt: "" };

const pick = (s: State): State => ({ heroMediaType: s.heroMediaType, heroMediaUrl: s.heroMediaUrl, heroPosterUrl: s.heroPosterUrl, heroImages: s.heroImages ?? [], heroAlt: s.heroAlt });

/** directVideoUpload : vidéo envoyée directement à Vercel Blob (production), sinon au serveur (disque local). */
export function HeroMediaForm({ directVideoUpload = false }: { directVideoUpload?: boolean }) {
  const [v, setV] = useState<State | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const imagesInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);

  useEffect(() => { fetcher<State>("/api/admin/settings").then((s) => setV(pick(s))).catch((e) => toast.error(e.message)); }, []);
  if (!v) return <p className="text-sm text-slate-500">Chargement…</p>;

  const upload = async (kind: "images" | "video" | "poster", files: File[]) => {
    if (!files.length) return;
    setProgress(0);
    try {
      if (kind === "video") {
        const url = await uploadVideo(files[0], directVideoUpload, setProgress);
        setV({ ...v, heroMediaType: "video", heroMediaUrl: url });
      } else if (kind === "images") {
        const room = MAX_IMAGES - (v.heroMediaType === "image" ? v.heroImages.length : 0);
        if (room <= 0) throw new Error(`${MAX_IMAGES} photos maximum`);
        if (files.length > room) toast.info(`Seules ${room} photo(s) ont été ajoutées (maximum ${MAX_IMAGES})`);
        const urls = await uploadImages(files.slice(0, room), setProgress);
        setV({ ...v, heroMediaType: "image", heroMediaUrl: "", heroPosterUrl: "", heroImages: [...(v.heroMediaType === "image" ? v.heroImages : []), ...urls] });
      } else {
        const [url] = await uploadImages(files.slice(0, 1), setProgress);
        setV({ ...v, heroPosterUrl: url });
      }
      setErrors({});
      toast.success("Envoyé — pensez à enregistrer");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const save = async (next: State = v) => {
    setBusy(true);
    setErrors({});
    try {
      const saved = pick(await fetcher<State>("/api/admin/settings/hero", { method: "PUT", body: next }));
      setV(saved);
      toast.success(saved.heroMediaType === "none" ? "Média retiré : le visuel de marque s'affiche" : "Page d'accueil mise à jour");
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message);
      if (err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, m]) => [k, m[0]])));
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, d: number) => {
    const a = [...v.heroImages]; const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    setV({ ...v, heroImages: a });
  };
  const removeImage = (i: number) => {
    const heroImages = v.heroImages.filter((_, k) => k !== i);
    setV({ ...v, heroImages, heroMediaType: heroImages.length ? "image" : "none" });
  };

  const isImages = v.heroMediaType === "image";
  const isVideo = v.heroMediaType === "video";
  const hasMedia = (isImages && v.heroImages.length > 0) || (isVideo && !!v.heroMediaUrl);
  const busyUpload = progress !== null;

  return (
    <>
      <PageHeader title="Page d’accueil" />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-[1fr_300px]">
        <section className="a-card space-y-5 p-5">
          <div>
            <h2 className="font-medium text-slate-900">Média principal</h2>
            <p className="mt-1 text-sm text-slate-500">Affiché à droite du titre de la page d’accueil. Vous pouvez le changer quand vous voulez. Sans média, un visuel de marque est affiché.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={isImages ? "a-btn-primary" : "a-btn-ghost"} disabled={busyUpload} onClick={() => imagesInput.current?.click()}><ImageIcon size={16} /> {isImages ? "Ajouter des photos" : "Photos (diaporama)"}</button>
            <button type="button" className={isVideo ? "a-btn-primary" : "a-btn-ghost"} disabled={busyUpload} onClick={() => videoInput.current?.click()}><Video size={16} /> {isVideo ? "Changer la vidéo" : "Vidéo"}</button>
            {hasMedia && <button type="button" className="a-btn-ghost text-rose-600" disabled={busy || busyUpload} onClick={() => save({ ...EMPTY })}><Trash2 size={16} /> Tout retirer</button>}
            <input ref={imagesInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { upload("images", [...(e.target.files ?? [])]); e.target.value = ""; }} />
            <input ref={videoInput} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => { upload("video", [...(e.target.files ?? [])]); e.target.value = ""; }} />
            <input ref={posterInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { upload("poster", [...(e.target.files ?? [])]); e.target.value = ""; }} />
          </div>
          {busyUpload && <div aria-live="polite"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-slate-500">Envoi… {progress}%</p></div>}
          {(errors.heroMediaUrl || errors.heroImages) && <p className="text-sm text-rose-600">{errors.heroMediaUrl || errors.heroImages}</p>}

          {isImages && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-800">Photos <span className="font-normal text-slate-400">· {v.heroImages.length}/{MAX_IMAGES} · défilement automatique toutes les {SLIDE_INTERVAL_MS / 1000} secondes</span></p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {v.heroImages.map((src, i) => (
                  <div key={src + i} className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(src, 320)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">{i + 1}</span>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-white disabled:opacity-30" aria-label="Avancer"><ArrowLeft size={14} /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === v.heroImages.length - 1} className="p-1 text-white disabled:opacity-30" aria-label="Reculer"><ArrowRight size={14} /></button>
                      <button type="button" onClick={() => removeImage(i)} className="p-1 text-rose-300" aria-label="Retirer"><X size={14} /></button>
                    </div>
                  </div>
                ))}
                {v.heroImages.length < MAX_IMAGES && (
                  <button type="button" disabled={busyUpload} onClick={() => imagesInput.current?.click()} className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-indigo-400 disabled:opacity-50"><Plus size={18} />Ajouter</button>
                )}
              </div>
              {v.heroImages.length === 1 && <p className="mt-2 text-xs text-slate-500">Une seule photo : elle reste fixe. Ajoutez-en d’autres pour activer le défilement.</p>}
            </div>
          )}

          {isVideo && v.heroMediaUrl && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">Image d’aperçu de la vidéo <span className="font-normal text-slate-400">(recommandée)</span></p>
              <p className="mt-0.5 text-xs text-slate-500">Affichée pendant le chargement et à la place de la vidéo sur connexion lente (3G, économiseur de données).</p>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" className="a-btn-ghost" disabled={busyUpload} onClick={() => posterInput.current?.click()}><Upload size={15} /> {v.heroPosterUrl ? "Changer l’aperçu" : "Ajouter un aperçu"}</button>
                {v.heroPosterUrl && <button type="button" className="text-xs text-rose-600 underline" onClick={() => setV({ ...v, heroPosterUrl: "" })}>Retirer</button>}
              </div>
              {errors.heroPosterUrl && <p className="mt-1 text-xs text-rose-600">{errors.heroPosterUrl}</p>}
            </div>
          )}

          <div>
            <label className="a-label">Description (accessibilité)</label>
            <input className="a-input" maxLength={160} placeholder="Ex. Collection printemps : bijoux et sacs" value={v.heroAlt} onChange={(e) => setV({ ...v, heroAlt: e.target.value })} />
            <p className="mt-1 text-xs text-slate-500">Lue par les lecteurs d’écran et affichée si le média ne charge pas.</p>
          </div>

          <ul className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <li>• <strong>Photos</strong> : jusqu’à {MAX_IMAGES} (JPG, PNG, WebP, AVIF), optimisées automatiquement ; format vertical recommandé (4:5). Elles défilent toutes les {SLIDE_INTERVAL_MS / 1000} secondes, avec une pause quand le visiteur survole l’image.</li>
            <li>• <strong>Vidéo</strong> : MP4 (H.264) ou WebM, <strong>25 Mo maximum</strong>, idéalement 5 à 15 secondes, lue en boucle et sans son. Photos et vidéo ne peuvent pas être mélangées : le dernier choix remplace l’autre.</li>
            <li>• Sur connexion lente ou avec « réduire les animations », seule la première photo est chargée (pas de défilement), et la vidéo n’est lue que sur appui.</li>
          </ul>

          <button type="button" className="a-btn-primary" disabled={busy || busyUpload} onClick={() => save()}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </section>

        <aside className="a-card h-fit p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Aperçu</p>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[260px] overflow-hidden rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200">
            {isImages && v.heroImages.length > 0 && <HeroMedia key={v.heroImages.join("|")} type="image" images={v.heroImages} url="" alt="" />}
            {isVideo && v.heroMediaUrl && <video key={v.heroMediaUrl} src={v.heroMediaUrl} poster={v.heroPosterUrl ? mediaUrl(v.heroPosterUrl, 480) : undefined} muted loop playsInline autoPlay controls className="h-full w-full object-cover" />}
            {!hasMedia && <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-400">Aucun média : le visuel de marque est affiché sur la page d’accueil</div>}
          </div>
        </aside>
      </div>
    </>
  );
}
