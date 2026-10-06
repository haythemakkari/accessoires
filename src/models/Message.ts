import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

/** Message envoyé depuis la page Contact. */
const messageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    orderNumber: { type: String, trim: true, uppercase: true },
    isRead: { type: Boolean, default: false, index: true },
    ip: { type: String },
  },
  { timestamps: true },
);
messageSchema.index({ createdAt: -1 });

export type MessageDoc = HydratedDocument<InferSchemaType<typeof messageSchema>>;
export const Message = (mongoose.models.Message as mongoose.Model<InferSchemaType<typeof messageSchema>>) || mongoose.model("Message", messageSchema);
