import { Types } from "mongoose";
import { Message } from "@/models/Message";
import { Order } from "@/models/Order";
import { AppError, notFound } from "@/lib/errors";
import { EXCHANGE_MAX_REPLIES, EXCHANGE_WINDOW_DAYS, deliveredAt, isWithinExchangeWindow } from "@/lib/exchange";

type NewExchange = { name: string; phone?: string; email?: string; subject: string; message: string; orderNumber?: string };

/**
 * Crée une demande d'échange. La commande doit exister, être livrée depuis 7 jours au plus, et ne pas avoir déjà fait l'objet d'une demande (une seule par commande).
 * Le client connecté la retrouvera dans « Mon compte » ; une commande d'un AUTRE compte est refusée.
 */
export async function createExchangeRequest(data: NewExchange, ctx: { userId: string | null; ip: string }) {
  const orderNumber = (data.orderNumber ?? "").toUpperCase();
  const order = await Order.findOne({ orderNumber }).select("user status statusHistory updatedAt");
  if (!order || (ctx.userId && order.user && String(order.user) !== ctx.userId)) {
    throw new AppError("Aucune commande ne correspond à ce numéro", 422, "ORDER_NOT_FOUND"); // même message dans les deux cas : on ne révèle pas les commandes d'autrui
  }
  if (order.status === "cancelled") throw new AppError("Cette commande a été annulée : un échange n'est pas possible", 422, "ORDER_CANCELLED");
  // Le délai court à partir de la livraison, confirmée par l'admin (statut « livrée »).
  const delivered = deliveredAt(order);
  if (!delivered) throw new AppError("Cette commande n'est pas encore livrée : l'échange sera possible après sa livraison", 422, "ORDER_NOT_DELIVERED");
  if (!isWithinExchangeWindow(delivered)) {
    throw new AppError(`Le délai de ${EXCHANGE_WINDOW_DAYS} jours après la livraison est dépassé pour cette commande`, 422, "EXCHANGE_WINDOW");
  }
  // Une seule demande d'échange par commande, quel que soit son état (même clôturée).
  if (await Message.exists({ kind: "exchange", orderNumber })) {
    throw new AppError("Une demande d'échange a déjà été faite pour cette commande : une seule demande est possible par commande", 409, "EXCHANGE_EXISTS");
  }
  return Message.create({ ...data, orderNumber, kind: "exchange", status: "open", order: order._id, user: ctx.userId ? new Types.ObjectId(ctx.userId) : undefined, ip: ctx.ip });
}

/** Réponse de l'admin : ajoutée au fil, la demande passe à « répondue » et le client verra une nouvelle réponse. */
export async function addAdminReply(id: string, text: string) {
  const m = await Message.findOneAndUpdate(
    { _id: id, kind: "exchange" },
    { $push: { replies: { from: "admin", text } }, $set: { status: "answered", isRead: true, customerUnread: true } },
    { returnDocument: "after" },
  );
  if (!m) throw notFound();
  return m;
}

export const customerExchanges = (userId: string) => Message.find({ kind: "exchange", user: userId }).sort({ createdAt: -1 }).limit(50).lean();

/** Le client ouvre sa demande : les réponses sont marquées comme vues. Uniquement SES demandes. */
export async function markExchangeSeen(userId: string, id: string) {
  const m = await Message.findOneAndUpdate({ _id: id, kind: "exchange", user: userId }, { customerUnread: false }, { returnDocument: "after" });
  if (!m) throw notFound();
  return m;
}

/**
 * Réponse du client dans sa demande (conversation). Uniquement sur SA demande et tant qu'elle n'est pas clôturée.
 * La demande repasse « à traiter » et devient non lue pour l'admin.
 */
export async function addCustomerReply(userId: string, id: string, text: string) {
  const m = await Message.findOne({ _id: id, kind: "exchange", user: userId }).select("status replies");
  if (!m) throw notFound();
  if (m.status === "closed") throw new AppError("Cette demande est clôturée : pour une autre question, écrivez-nous via la page Contact", 409, "EXCHANGE_CLOSED");
  if (m.replies.length >= EXCHANGE_MAX_REPLIES) throw new AppError("Cette conversation est trop longue : contactez-nous par téléphone", 409, "EXCHANGE_FULL");
  return Message.findOneAndUpdate(
    { _id: id, kind: "exchange", user: userId, status: { $ne: "closed" } },
    { $push: { replies: { from: "customer", text } }, $set: { status: "open", isRead: false, customerUnread: false } },
    { returnDocument: "after" },
  );
}
