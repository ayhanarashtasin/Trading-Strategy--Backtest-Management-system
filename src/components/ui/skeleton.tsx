import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders.
 *
 * These mirror the real layouts closely enough that the page doesn't jump when
 * the data lands — a metric plate skeleton occupies a metric plate's box, a
 * table skeleton keeps the header rule and the row rhythm. The point is that
 * navigation paints something structured immediately instead of an empty
 * content well.
 *
 * Server-safe: no hooks, no client boundary, so `loading.tsx` ships none of
 * this as client JS.
 */

/* The primitive: a muted block that breathes. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded bg-muted", className)} />
  );
}

/**
 * Wraps a whole loading view. Screen readers get one polite announcement
 * rather than a shape-by-shape reading of the placeholders.
 */
export function SkeletonScreen({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-6", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/* Matches PageHeader: eyebrow, title, one line of orientation, actions. */
export function PageHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      {actions > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-md" />
          ))}
        </div>
      )}
    </div>
  );
}

/* Matches MetricPlate's box: eyebrow, reading, note. */
export function MetricPlateSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-plate">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="mt-3 h-6 w-20" />
      <Skeleton className="mt-2.5 h-2.5 w-24" />
    </div>
  );
}

export function MetricRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <MetricPlateSkeleton key={i} />
      ))}
    </div>
  );
}

/* The filter/search strip that sits above the list views. */
export function ToolbarSkeleton({ controls = 3 }: { controls?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-plate">
      <Skeleton className="h-8 w-56 rounded-md" />
      {Array.from({ length: controls }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-32 rounded-md" />
      ))}
      <div className="flex-1" />
      <Skeleton className="h-8 w-24 rounded-md" />
    </div>
  );
}

/**
 * Keeps the header rule and row rhythm of a real table so the switch to live
 * rows doesn't shift the page.
 */
export function TableSkeleton({
  rows = 8,
  cols = 7,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-plate">
      <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-2.5", i === 0 ? "w-40 shrink-0" : "flex-1")}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3", c === 0 ? "w-40 shrink-0" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* A card in the strategies grid: title, family line, body, version chips. */
export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-plate">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="h-4 w-14 rounded" />
        <div className="flex-1" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Rows only, no surrounding plate — for dropping inside a Card that already
 * supplies the border and background.
 */
export function ListRowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-2.5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* Activity feed / team roster: an icon, two lines, a timestamp. */
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-plate">
      <ListRowsSkeleton rows={rows} />
    </div>
  );
}

/**
 * `<tr>` placeholders for a real `<table>` that is already rendering its own
 * `<thead>`. Anything but a row is invalid inside `<tbody>`, so this returns
 * rows and nothing else.
 */
export function TableRowsSkeleton({
  rows = 10,
  cols,
}: {
  rows?: number;
  cols: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border/60 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className={cn("py-3", c === 0 && "pl-5")}>
              <Skeleton className={cn("h-3", c === 0 ? "w-36" : "w-full")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* Strategy and backtest detail pages: breadcrumb, header, readings, panels. */
export function DetailSkeleton() {
  return (
    <SkeletonScreen>
      <Skeleton className="h-2.5 w-48" />
      <PageHeaderSkeleton actions={2} />
      <MetricRowSkeleton count={6} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-plate">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <TableSkeleton rows={5} cols={6} />
        </div>
        <div className="space-y-4">
          <ListSkeleton rows={4} />
          <ListSkeleton rows={3} />
        </div>
      </div>
    </SkeletonScreen>
  );
}

/* The new/edit forms. */
export function FormSkeleton({ fields = 8 }: { fields?: number }) {
  return (
    <SkeletonScreen label="Loading form">
      <PageHeaderSkeleton actions={2} />
      <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-plate">
        <Skeleton className="h-3.5 w-36" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </SkeletonScreen>
  );
}
