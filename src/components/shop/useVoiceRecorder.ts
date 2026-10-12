"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_AUDIO_SECONDS } from "@/lib/exchange-files";

/** Format d'enregistrement pris en charge par ce navigateur : WebM/Opus (Chrome, Firefox, Android), MP4/AAC (Safari, iPhone), Ogg. */
function pickMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const [mime, ext] of [["audio/webm;codecs=opus", "webm"], ["audio/webm", "webm"], ["audio/mp4", "mp4"], ["audio/ogg;codecs=opus", "ogg"]] as const) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  return null;
}

export type Recorded = { blob: Blob; ext: string; seconds: number };

/** Enregistrement d'un message vocal avec le micro (durée maximale : 2 minutes, arrêt automatique). */
export function useVoiceRecorder(onDone: (r: Recorded) => void) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const started = useRef(0);
  const cancelled = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => { setSupported(!!pickMime() && !!navigator.mediaDevices?.getUserMedia); }, []);
  const cleanup = useCallback(() => {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setRecording(false);
  }, []);
  useEffect(() => () => { cancelled.current = true; if (rec.current?.state === "recording") rec.current.stop(); cleanup(); }, [cleanup]);

  const stop = useCallback(() => { if (rec.current?.state === "recording") rec.current.stop(); }, []);
  const cancel = useCallback(() => { cancelled.current = true; stop(); }, [stop]);

  const start = useCallback(async () => {
    setError(null);
    const fmt = pickMime();
    if (!fmt) return setError("L’enregistrement vocal n’est pas disponible sur ce navigateur.");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return setError((e as DOMException).name === "NotAllowedError" ? "Autorisez le micro dans votre navigateur pour enregistrer un message vocal." : "Micro introuvable.");
    }
    cancelled.current = false;
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream.current, { mimeType: fmt.mime, audioBitsPerSecond: 32_000 });
    rec.current = r;
    r.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    r.onstop = () => {
      const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
      cleanup();
      if (!cancelled.current && chunks.length) done.current({ blob: new Blob(chunks, { type: fmt.mime.split(";")[0] }), ext: fmt.ext, seconds: Math.min(secs, MAX_AUDIO_SECONDS) });
    };
    started.current = Date.now();
    setSeconds(0);
    setRecording(true);
    r.start(1000);
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - started.current) / 1000);
      setSeconds(s);
      if (s >= MAX_AUDIO_SECONDS) stop(); // durée maximale atteinte : le message part tel quel
    }, 250);
  }, [cleanup, stop]);

  return { supported, recording, seconds, error, start, stop, cancel };
}
