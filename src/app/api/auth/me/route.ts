import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const GET = api(async () => {
  const u = await getCurrentUser();
  return { user: u ? { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role } : null };
});
