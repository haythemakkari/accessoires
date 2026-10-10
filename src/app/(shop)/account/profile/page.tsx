import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "@/components/shop/AccountForms";

export const metadata = { title: "Mes informations", robots: { index: false } };

export default async function ProfilePage() {
  const u = await requireUser();
  return (
    <div className="space-y-10">
      <section>
        <h1 className="h-display mb-6 text-3xl">Informations personnelles</h1>
        <ProfileForm name={u.name} phone={u.phone ?? ""} email={u.email} />
      </section>
      <section id="mot-de-passe" aria-labelledby="pwd-title">
        <h2 id="pwd-title" className="h-display mb-2 text-2xl">Mot de passe</h2>
        {u.passwordSet === false ? (
          <p className="rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink/70">Votre compte est connecté avec <strong>Google</strong> : vous n’avez pas de mot de passe à gérer. Utilisez « Continuer avec Google » pour vous connecter.</p>
        ) : (
          <>
            <p className="mb-6 text-sm text-ink/65">Au moins 8 caractères, avec une lettre et un chiffre. Vos autres appareils seront déconnectés après le changement.</p>
            <PasswordForm />
          </>
        )}
      </section>
    </div>
  );
}
