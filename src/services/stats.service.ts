import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Coupon } from "@/models/Coupon";

/** Produits actifs dont le stock est strictement inférieur au seuil, du plus urgent (rupture) au moins urgent. */
export async function lowStockProducts(threshold: number, limit = 50) {
  const filter = { isActive: true, stock: { $lt: threshold } };
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ stock: 1, name: 1 }).limit(limit).select("name sku stock images").lean(),
    Product.countDocuments(filter),
  ]);
  return { total, items: items.map((p) => ({ id: String(p._id), name: p.name, sku: p.sku, stock: p.stock, image: p.images?.[0] ?? null })) };
}

export async function dashboardStats() {
  const since = new Date(Date.now() - 30 * 86400000);
  const sinceYear = new Date(Date.now() - 365 * 86400000);
  const valid = { status: { $ne: "cancelled" } };

  const [revenueAgg, byStatus, products, outOfStock, customers, couponsUsed, daily, monthly, top] = await Promise.all([
    Order.aggregate([{ $match: valid }, { $group: { _id: null, revenue: { $sum: "$total" } } }]),
    Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Product.countDocuments(),
    Product.countDocuments({ stock: 0 }),
    User.countDocuments({ role: "customer" }),
    Coupon.aggregate([{ $group: { _id: null, n: { $sum: "$usedCount" } } }]),
    Order.aggregate([
      { $match: { ...valid, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { ...valid, createdAt: { $gte: sinceYear } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Product.find({ soldCount: { $gt: 0 } }).sort({ soldCount: -1 }).limit(5).select("name soldCount").lean(),
  ]);
  const status = Object.fromEntries(byStatus.map((s) => [s._id, s.n as number]));
  return {
    revenue: revenueAgg[0]?.revenue ?? 0,
    orders: (Object.values(status) as number[]).reduce((a, b) => a + b, 0),
    status,
    products,
    outOfStock,
    customers,
    couponsUsed: couponsUsed[0]?.n ?? 0,
    daily: daily.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    monthly: monthly.map((d) => ({ month: d._id, revenue: d.revenue, orders: d.orders })),
    top: top.map((t) => ({ name: t.name, sold: t.soldCount })),
  };
}
