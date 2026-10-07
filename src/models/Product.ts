import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

export const GENDERS = ["homme", "femme", "unisex"] as const;

/** Image associée à UNE option d'une variante (ex. option « Noir » → photo du produit en noir). */
const optionImageSchema = new Schema({ option: { type: String, required: true, trim: true }, image: { type: String, required: true, trim: true } }, { _id: false });

const variantSchema = new Schema(
  { name: { type: String, required: true, trim: true }, options: [{ type: String, trim: true }], optionImages: { type: [optionImageSchema], default: [] } },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "", maxlength: 5000 },
    /** Prix courant de référence (hors promo). */
    price: { type: Number, required: true, min: 0 },
    /** Ancien prix affiché barré. */
    compareAtPrice: { type: Number, min: 0 },
    /** Prix promotionnel, appliqué si isOnSale. */
    salePrice: { type: Number, min: 0 },
    isOnSale: { type: Boolean, default: false },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    gender: { type: String, enum: GENDERS, default: "unisex" },
    images: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    variants: { type: [variantSchema], default: [] },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    /** Compteur de ventes → tri par popularité / meilleures ventes. */
    soldCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ isActive: 1, gender: 1, price: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ isActive: 1, isOnSale: 1 });
productSchema.index({ isActive: 1, soldCount: -1 });
productSchema.index({ isActive: 1, stock: 1 }); // alertes de stock bas

productSchema.virtual("currentPrice").get(function () {
  return this.isOnSale && this.salePrice != null && this.salePrice < this.price ? this.salePrice : this.price;
});
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export type ProductDoc = HydratedDocument<InferSchemaType<typeof productSchema>> & { currentPrice: number };
export const Product = (mongoose.models.Product as mongoose.Model<InferSchemaType<typeof productSchema>>) || mongoose.model("Product", productSchema);
