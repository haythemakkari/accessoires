import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    /** Email normalisé (alias gmail, +tag) — unicité anti-multi-comptes. */
    emailNormalized: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    phoneNormalized: { type: String, sparse: true, unique: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },
    isActive: { type: Boolean, default: true },
    /** Incrémenté pour invalider toutes les sessions (changement de mot de passe, etc.). */
    tokenVersion: { type: Number, default: 0 },
    signupIp: { type: String, index: true },
    welcomeCouponCode: { type: String },
    /** Identifiant Google (« sub ») : compte créé ou relié via « Continuer avec Google ». */
    googleId: { type: String, sparse: true, unique: true },
    /** false = compte créé via Google, sans mot de passe défini (le hash stocké est aléatoire et inutilisable). */
    passwordSet: { type: Boolean, default: true },
  },
  { timestamps: true },
);
userSchema.index({ createdAt: -1 });

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = (mongoose.models.User as mongoose.Model<InferSchemaType<typeof userSchema>>) || mongoose.model("User", userSchema);
