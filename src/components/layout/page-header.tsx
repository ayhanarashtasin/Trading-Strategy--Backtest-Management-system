import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The header block every page opens with: a mono section marker, the title,
 * one line of orientation, and the actions that belong to this page. Keeping
 * it in one component is what makes the app read as a single document.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.375rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
