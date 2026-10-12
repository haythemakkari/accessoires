import { attachmentUrl } from "./exchange-files";

/** Vue d'une demande d'échange pour le client : sans adresse IP ni champs internes. */
type Doc = {
  _id: unknown; subject: string; message: string; orderNumber?: string | null; status: string; customerUnread?: boolean; createdAt: unknown;
  replies?: { from: string; text: string; createdAt: unknown; attachments?: { kind: string; name: string; duration?: number | null }[] }[];
};
export const toCustomerExchange = (m: Doc) => ({
  id: String(m._id),
  subject: m.subject,
  message: m.message,
  orderNumber: m.orderNumber ?? "",
  status: m.status,
  unread: !!m.customerUnread,
  createdAt: m.createdAt,
  replies: (m.replies ?? []).map((r) => ({ from: r.from, text: r.text, createdAt: r.createdAt, attachments: (r.attachments ?? []).map((a) => ({ kind: a.kind as "image" | "audio", url: attachmentUrl(a.name), duration: a.duration ?? null })) })),
});
export type CustomerExchange = ReturnType<typeof toCustomerExchange>;
