import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand-50 px-4 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="h-display mt-3 text-5xl">Page introuvable</h1>
      <p className="mt-3 text-ink/60">Cette page n’existe pas ou a été déplacée.</p>
      <Link href="/" className="btn-primary mt-8">Retour à l’accueil</Link>
    </div>
  );
}
