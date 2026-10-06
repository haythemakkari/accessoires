import { api } from "@/lib/api";
import { plain } from "@/lib/utils";
import { Category } from "@/models/Category";

export const GET = api(async () => plain(await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()));
