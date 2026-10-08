import { HeroMediaForm } from "@/components/admin/HeroMediaForm";
import { usesBlob } from "@/lib/storage";

export const metadata = { title: "Page d'accueil" };
export default function Page() { return <HeroMediaForm directVideoUpload={usesBlob()} />; }
