import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { plain } from "@/lib/utils";
import { Coupon } from "@/models/Coupon";

export const GET = api(async () => {
  const user = await requireUser();
  return plain(await Coupon.find({ allowedUsers: user._id }).sort({ createdAt: -1 }).lean());
});
