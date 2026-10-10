import mongoose, { Schema, type InferSchemaType } from "mongoose";

/** Panier d'un client connecté, conservé côté serveur : il le retrouve sur un autre appareil, même si son navigateur a vidé ses données. */
const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: {
      type: [{ product: { type: Schema.Types.ObjectId, ref: "Product", required: true }, variant: { type: String, trim: true }, packaging: { type: String, trim: true }, quantity: { type: Number, required: true, min: 1, max: 50 }, _id: false }],
      default: [],
    },
    couponCode: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true },
);
// Un panier abandonné est supprimé automatiquement après 60 jours sans modification.
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

export type CartDoc = InferSchemaType<typeof cartSchema>;
export const Cart = (mongoose.models.Cart as mongoose.Model<CartDoc>) || mongoose.model("Cart", cartSchema);
