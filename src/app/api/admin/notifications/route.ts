import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/services/settings.service";
import { lowStockProducts } from "@/services/stats.service";

/** Notifications admin : alertes de stock bas (calculées en direct, donc toujours à jour). */
export const GET = api(async () => {
  await requireAdmin();
  const { lowStockThreshold } = await getSettings();
  const { total, items } = await lowStockProducts(lowStockThreshold);
  return { threshold: lowStockThreshold, count: total, lowStock: items };
});
