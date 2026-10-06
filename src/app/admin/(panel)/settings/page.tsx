import { SettingsForm } from "@/components/admin/SettingsForm";
import { WelcomeSettingsForm } from "@/components/admin/WelcomeSettingsForm";
import { ContactSettingsForm } from "@/components/admin/ContactSettingsForm";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";

export const metadata = { title: "Paramètres" };
export default function Page() {
  return (
    <>
      <SettingsForm />
      <div className="mt-4"><WelcomeSettingsForm /></div>
      <div className="mt-4"><ContactSettingsForm /></div>
      <div className="mt-4"><AdminPasswordForm /></div>
    </>
  );
}
