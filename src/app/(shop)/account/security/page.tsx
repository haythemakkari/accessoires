import { PasswordForm } from "@/components/shop/AccountForms";

export const metadata = { title: "Mot de passe", robots: { index: false } };

export default function SecurityPage() {
  return (<div><h1 className="h-display mb-6 text-3xl">Modifier le mot de passe</h1><PasswordForm /></div>);
}
