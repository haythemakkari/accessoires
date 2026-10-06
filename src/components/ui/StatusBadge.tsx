import { STATUS_LABEL, STATUS_STYLE } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-700"}`}>{STATUS_LABEL[status] ?? status}</span>;
}
