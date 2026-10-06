import { PageHeader } from "@/components/admin/ui";
import { Dashboard } from "@/components/admin/Dashboard";

export const metadata = { title: "Tableau de bord" };

export default function AdminHome() {
  return (<><PageHeader title="Tableau de bord" /><Dashboard /></>);
}
