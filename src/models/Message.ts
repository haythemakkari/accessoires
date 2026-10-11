import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

/** Réponse dans le fil d'une demande d'échange (de l'admin vers le client). */
const replySchema = new Schema({ from: { type: String, enum: ["admin", "customer"], required: true }, text: { type: String, required: true, trim: true, maxlength: 2000 } }, { timestamps: { createdAt: true, updatedAt: false } });

export const EXCHANGE_STATUSES = ["open", "answered", "closed"] as const;
export type ExchangeStatus = (typeof EXCHANGE_STATUSES)[number];

/** Message envoyé depuis la page Contact, ou demande d'échange (kind = "exchange") avec son fil de réponses. */
const messageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    orderNumber: { type: String, trim: true, uppercase: true },
    /** « contact » : formulaire Contact. « exchange » : demande d'échange (suivie dans l'espace du client, traitée à part par l'admin). */
    kind: { type: String, enum: ["contact", "exchange"], default: "contact", index: true },
    /** Compte du client s'il était connecté : c'est ce qui lui permet de retrouver sa demande dans « Mon compte ». */
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    status: { type: String, enum: EXCHANGE_STATUSES, default: "open" },
    replies: { type: [replySchema], default: [] },
    /** Une réponse de l'admin n'a pas encore été consultée par le client. */
    customerUnread: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false, index: true },
    ip: { type: String },
  },
  { timestamps: true },
);
messageSchema.index({ createdAt: -1 });
messageSchema.index({ kind: 1, user: 1, createdAt: -1 });

export type MessageDoc = HydratedDocument<InferSchemaType<typeof messageSchema>>;
export const Message = (mongoose.models.Message as mongoose.Model<InferSchemaType<typeof messageSchema>>) || mongoose.model("Message", messageSchema);
