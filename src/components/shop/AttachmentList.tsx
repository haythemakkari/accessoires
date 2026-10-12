/** Pièces jointes d'un message de la conversation : photos (ouvrables en grand) et messages vocaux (lecteur audio). */
export type ViewAttachment = { kind: "image" | "audio"; url: string; duration?: number | null };

export const fmtDuration = (s?: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);

export function AttachmentList({ items, tone = "light" }: { items: ViewAttachment[]; tone?: "light" | "dark" }) {
  if (!items.length) return null;
  const images = items.filter((a) => a.kind === "image");
  const audios = items.filter((a) => a.kind === "audio");
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-black/10" aria-label="Ouvrir la photo en grand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt="Photo jointe" loading="lazy" decoding="async" className="h-24 w-24 object-cover sm:h-28 sm:w-28" />
            </a>
          ))}
        </div>
      )}
      {audios.map((a) => (
        <div key={a.url} className={`flex items-center gap-2 rounded-xl p-2 ${tone === "dark" ? "bg-white/10" : "bg-sand-100"}`}>
          <audio controls preload="none" src={a.url} className="h-9 w-full min-w-0 max-w-xs" aria-label="Message vocal" />
          {a.duration != null && <span className="shrink-0 text-xs tabular-nums opacity-70">{fmtDuration(a.duration)}</span>}
        </div>
      ))}
    </div>
  );
}
