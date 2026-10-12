"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Send, Square, X } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { uploadExchangeFile } from "@/lib/client/upload";
import { MAX_ATTACHMENTS_PER_REPLY, MAX_AUDIO_SECONDS } from "@/lib/exchange-files";
import { fmtDuration } from "./AttachmentList";
import { useVoiceRecorder } from "./useVoiceRecorder";

type Pending = { id: number; kind: "image" | "audio"; preview: string; name?: string; duration?: number; status: "uploading" | "done" | "error"; progress: number };
let seq = 0;

/** Zone d'écriture du client dans sa demande d'échange : texte, photos (jusqu'à 5) et un message vocal (2 min maximum). */
export function ReplyComposer({ requestId, onSent }: { requestId: string; onSent: () => void | Promise<void> }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Pending[]>([]);
  const [sending, setSending] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const patch = (id: number, p: Partial<Pending>) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const upload = async (item: Pending, blob: Blob, filename: string) => {
    try {
      const r = await uploadExchangeFile(blob, filename, (f) => patch(item.id, { progress: Math.round(f * 100) }));
      patch(item.id, { status: "done", name: r.name, progress: 100 });
    } catch (e) {
      patch(item.id, { status: "error" });
      toast.error((e as Error).message);
    }
  };
  const add = (kind: Pending["kind"], blob: Blob, filename: string, duration?: number) => {
    const item: Pending = { id: ++seq, kind, preview: URL.createObjectURL(blob), duration, status: "uploading", progress: 0 };
    setItems((l) => [...l, item]);
    void upload(item, blob, filename);
  };

  const voice = useVoiceRecorder(({ blob, ext, seconds }) => add("audio", blob, `vocal.${ext}`, seconds));
  const hasAudio = items.some((i) => i.kind === "audio");
  const slots = MAX_ATTACHMENTS_PER_REPLY - items.length;

  const pickImages = (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, slots));
    if (files.length > list.length) toast.info(`${MAX_ATTACHMENTS_PER_REPLY} pièces jointes maximum par message`);
    list.forEach((f) => add("image", f, f.name));
  };

  const remove = (i: Pending) => {
    setItems((l) => l.filter((x) => x.id !== i.id));
    URL.revokeObjectURL(i.preview);
    if (i.name) fetcher(`/api/account/exchanges/files?name=${encodeURIComponent(i.name)}`, { method: "DELETE" }).catch(() => {}); // fichier jamais envoyé : supprimé du stockage
  };
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const uploading = items.some((i) => i.status === "uploading");
  const ready = items.filter((i) => i.status === "done");
  const canSend = !sending && !uploading && !voice.recording && (text.trim().length >= 2 || ready.length > 0);

  const send = async () => {
    setSending(true);
    try {
      await fetcher(`/api/account/exchanges/${requestId}/reply`, { method: "POST", body: { text: text.trim(), attachments: ready.map((i) => ({ name: i.name, duration: i.duration ?? null })) } });
      items.forEach((i) => URL.revokeObjectURL(i.preview));
      setItems([]);
      setText("");
      await onSent();
    } catch (e) { toast.error((e as Error).message); } finally { setSending(false); }
  };

  return (
    <div>
      <label className="label" htmlFor={`rep-${requestId}`}>Votre message</label>
      <textarea id={`rep-${requestId}`} rows={3} maxLength={2000} className="input" placeholder="Répondre à l’équipe…" value={text} onChange={(e) => setText(e.target.value)} />

      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Pièces jointes à envoyer">
          {items.map((i) => (
            <li key={i.id} className={`relative overflow-hidden rounded-xl border ${i.status === "error" ? "border-rose-300 bg-rose-50" : "border-ink/10 bg-white"}`}>
              {i.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.preview} alt="Photo à envoyer" className={`h-20 w-20 object-cover ${i.status !== "done" ? "opacity-50" : ""}`} />
              ) : (
                <div className="flex h-20 w-56 flex-col justify-center gap-1 px-3">
                  <audio controls src={i.preview} className="h-8 w-full" aria-label="Aperçu du message vocal" />
                  <span className="text-xs text-ink/60">Message vocal · {fmtDuration(i.duration)}</span>
                </div>
              )}
              {i.status === "uploading" && <span className="absolute inset-x-0 bottom-0 h-1 bg-ink/10"><span className="block h-full bg-brass" style={{ width: `${i.progress}%` }} /></span>}
              {i.status === "error" && <span className="absolute inset-x-0 bottom-0 bg-rose-600 py-0.5 text-center text-[10px] text-white">Échec</span>}
              <button type="button" onClick={() => remove(i)} aria-label="Retirer cette pièce jointe" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-white"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!voice.recording && (
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-ink/50 ${slots <= 0 ? "pointer-events-none opacity-40" : ""}`}>
            <ImagePlus size={16} /> Photo
            <input type="file" accept="image/*" multiple className="sr-only" disabled={slots <= 0} onChange={(e) => { pickImages(e.target.files); e.target.value = ""; }} />
          </label>
        )}
        {voice.supported && !voice.recording && (
          <button type="button" onClick={voice.start} disabled={hasAudio || slots <= 0} className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-ink/50 disabled:opacity-40" title={hasAudio ? "Un seul message vocal par envoi" : "Enregistrer un message vocal"}>
            <Mic size={16} /> Message vocal
          </button>
        )}
        {voice.recording && (
          <div className="flex flex-wrap items-center gap-3 rounded-full bg-rose-50 py-1.5 pl-4 pr-1.5 text-sm" role="status">
            <span className="flex items-center gap-2 font-medium text-rose-700"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600" /> Enregistrement… <span className="tabular-nums">{fmtDuration(voice.seconds)}</span> <span className="text-xs font-normal text-rose-700/70">/ {fmtDuration(MAX_AUDIO_SECONDS)}</span></span>
            <button type="button" onClick={voice.stop} className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 font-medium text-white"><Square size={13} fill="currentColor" /> Terminer</button>
            <button type="button" onClick={voice.cancel} className="rounded-full px-3 py-2 text-rose-700 underline underline-offset-4">Annuler</button>
          </div>
        )}
        <button type="button" onClick={send} disabled={!canSend} className="btn-primary ml-auto !py-2.5"><Send size={15} /> {sending ? "Envoi…" : uploading ? "Envoi des fichiers…" : "Envoyer"}</button>
      </div>
      {voice.error && <p className="mt-2 text-xs text-rose-600" role="alert">{voice.error}</p>}
    </div>
  );
}
