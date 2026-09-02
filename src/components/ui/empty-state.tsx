import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * An empty screen is an invitation to act, so it names the thing that is
 * missing and offers the action that fills it.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-14 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** The same shape, for the moment before data arrives. */
export function LoadingState({ label = "Reading the record" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
      <div className="mb-3 h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="eyebrow">{label}</p>
    </div>
  );
}
