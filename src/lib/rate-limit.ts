import { AppError } from "./errors";

type Bucket = { count: number; reset: number };
const g = globalThis as unknown as { _rl?: Map<string, Bucket> };
const buckets = (g._rl ??= new Map<string, Bucket>());

/** Limiteur en mémoire (par instance). Pour du multi-instances, remplacer par Redis. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++b.count > limit) throw new AppError("Trop de tentatives, réessayez plus tard", 429, "RATE_LIMIT");
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}

/**
 * Limiteur « échecs seulement » pour les connexions : seules les tentatives ratées comptent,
 * et une connexion réussie remet le compteur à zéro. Un admin légitime n'est donc jamais bloqué
 * par ses propres connexions réussies.
 */
export function assertNotLocked(key: string, limit: number) {
  const b = buckets.get(key);
  if (b && b.reset > Date.now() && b.count >= limit) {
    const min = Math.ceil((b.reset - Date.now()) / 60000);
    throw new AppError(`Trop de tentatives échouées. Réessayez dans ${min} minute${min > 1 ? "s" : ""}.`, 429, "RATE_LIMIT");
  }
}
export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) buckets.set(key, { count: 1, reset: now + windowMs });
  else b.count++;
}
export const resetFailures = (key: string) => void buckets.delete(key);
