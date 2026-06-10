import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { RunStatus, Severity } from "@/lib/types";
import { formatStatus, severityClass, statusClass } from "@/lib/format";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-border bg-white shadow-panel", className)}>{children}</section>;
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1", statusClass(status))}>
      {formatStatus(status)}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity?: Severity | null }) {
  if (!severity) return <span className="text-sm text-muted">None</span>;
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1", severityClass(severity))}>
      {severity}
    </span>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}

export function LoadingPanel({ label = "Loading data" }: { label?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 text-sm text-muted shadow-panel">
      {label}...
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      {message}
    </div>
  );
}
