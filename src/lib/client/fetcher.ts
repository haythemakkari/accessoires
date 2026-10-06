export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: Record<string, string[]>) {
    super(message);
  }
}

/** Appel JSON typé vers nos routes API ; lance ApiError avec le message serveur. */
export async function fetcher<T = unknown>(url: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Une erreur est survenue", res.status, data.code, data.details);
  return data as T;
}
