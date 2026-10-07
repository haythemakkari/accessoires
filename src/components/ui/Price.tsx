import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Price({ price, salePrice, compareAt, onSale, size = "md" }: { price: number; salePrice?: number | null; compareAt?: number | null; onSale?: boolean; size?: "md" | "lg" }) {
  const sale = onSale && salePrice != null && salePrice < price;
  const old = sale ? price : compareAt && compareAt > price ? compareAt : null;
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={cn("font-semibold", size === "lg" ? "text-2xl" : "text-base", sale && "text-clay")}>{formatPrice(sale ? salePrice! : price)}</span>
      {old && <span className={cn("text-ink/60 line-through", size === "lg" ? "text-base" : "text-sm")}>{formatPrice(old)}</span>}
    </span>
  );
}
