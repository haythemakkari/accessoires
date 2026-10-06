export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BAD_REQUEST",
    public details?: unknown,
  ) {
    super(message);
  }
}
export const notFound = (m = "Ressource introuvable") => new AppError(m, 404, "NOT_FOUND");
export const unauthorized = (m = "Authentification requise") => new AppError(m, 401, "UNAUTHORIZED");
export const forbidden = (m = "Accès refusé") => new AppError(m, 403, "FORBIDDEN");
