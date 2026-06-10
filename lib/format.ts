import type { RunStatus, Severity } from "@/lib/types";

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatStatus(value: RunStatus) {
  return value.replace("_", " ");
}

export function statusClass(value: RunStatus) {
  if (value === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (value === "failed") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

export function severityClass(value?: Severity | null) {
  if (value === "critical") return "bg-red-100 text-red-800 ring-red-200";
  if (value === "high") return "bg-orange-100 text-orange-800 ring-orange-200";
  if (value === "medium") return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}
