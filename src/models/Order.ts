import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true, min: 0 }, // prix unitaire figé au moment de la commande
    quantity: { type: Number, required: true, min: 1 },
    variant: { type: String },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isGuest: { type: Boolean, required: true, index: true },
    customer: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    address: {
      line: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, trim: true },
      notes: { type: String, trim: true, maxlength: 500 },
    },
    items: { type: [itemSchema], validate: (v: unknown[]) => v.length > 0 },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    coupon: { id: { type: Schema.Types.ObjectId, ref: "Coupon" }, code: String },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    statusHistory: { type: [{ status: String, at: { type: Date, default: Date.now }, _id: false }], default: [] },
    /** Le stock a-t-il été remis en stock (annulation) ? Évite une double restitution. */
    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true },
);
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });

export type OrderDoc = HydratedDocument<InferSchemaType<typeof orderSchema>>;
export const Order = (mongoose.models.Order as mongoose.Model<InferSchemaType<typeof orderSchema>>) || mongoose.model("Order", orderSchema);
