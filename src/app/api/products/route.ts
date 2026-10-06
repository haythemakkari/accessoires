import { api, parseQuery } from "@/lib/api";
import { productListQuery } from "@/validation/schemas";
import { listProducts } from "@/services/product.service";

export const GET = api(async (req) => listProducts(parseQuery(req, productListQuery)));
