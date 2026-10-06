import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { normalizePhone } from "@/lib/utils";
import { User } from "@/models/User";
import { profileSchema } from "@/validation/schemas";

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const data = await parseBody(req, profileSchema);
  const phoneNormalized = data.phone ? normalizePhone(data.phone) : undefined;
  if (phoneNormalized && (await User.exists({ phoneNormalized, _id: { $ne: user._id } })))
    throw new AppError("Ce numéro est déjà utilisé", 409, "PHONE_TAKEN");
  user.name = data.name;
  user.phone = data.phone;
  user.phoneNormalized = phoneNormalized;
  await user.save();
  return { user: { id: user.id, name: user.name, email: user.email, phone: user.phone } };
});
