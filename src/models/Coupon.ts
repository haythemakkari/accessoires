import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    /** null = illimité */
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    /** Vide = utilisable par tous ; sinon réservé à ces utilisateurs. */
    allowedUsers: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    kind: { type: String, enum: ["standard", "welcome"], default: "standard", index: true },
  },
  { timestamps: true },
);
couponSchema.index({ allowedUsers: 1, kind: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });

export type CouponDoc = HydratedDocument<InferSchemaType<typeof couponSchema>>;
export const Coupon = (mongoose.models.Coupon as mongoose.Model<InferSchemaType<typeof couponSchema>>) || mongoose.model("Coupon", couponSchema);
