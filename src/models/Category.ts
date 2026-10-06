import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CategoryDoc = HydratedDocument<InferSchemaType<typeof categorySchema>>;
export const Category = (mongoose.models.Category as mongoose.Model<InferSchemaType<typeof categorySchema>>) || mongoose.model("Category", categorySchema);
