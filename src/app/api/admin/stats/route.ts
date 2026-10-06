import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { dashboardStats } from "@/services/stats.service";

export const GET = api(async () => {
  await requireAdmin();
  return dashboardStats();
});
