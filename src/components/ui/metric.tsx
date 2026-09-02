import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "gain" | "loss" | "signal" | "attention";

const toneText: Record<Tone, string> = {
  neutral: "text-foreground",
  gain: "text-profit",
  loss: "text-loss",
  signal: "text-primary",
  attention: "text-sun",
};

/**
 * The instrument reading — the app's signature unit.
 *
 * A letterspaced mono label, a tabular figure, and an optional note, on a
 * white plate. Every number the researcher scans is set this way, so the
 * dashboard, the drawer, the compare view and the leaderboard all read off
 * the same instrument.
 */
export function MetricPlate({
  label,
  value,
  note,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-plate transition-colors hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className="shrink-0 text-muted-foreground/60">{icon}</span>
        )}
      </div>

      <p className={cn("reading mt-3", toneText[tone])}>{value}</p>

      {note && (
        <p className="mt-2 text-[11px] leading-tight text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * Inline reading — the same label/value pair without the plate, for use inside
 * detail panels, drawers and definition grids.
 */
export function Reading({
  label,
  value,
  tone = "neutral",
  mono = true,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  mono?: boolean;
  className?: string;
}) {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    value === "N/A" ||
    value === "—";

  return (
    <div className={cn("min-w-0", className)}>
      <p className="eyebrow truncate">{label}</p>
      <p
        className={cn(
          "mt-1 text-[13px] font-medium leading-snug",
          mono && "font-mono",
          empty ? "text-muted-foreground/60" : toneText[tone]
        )}
      >
        {empty ? "—" : value}
      </p>
    </div>
  );
}

/**
 * A single measured value in a detail panel. Anything the platform did not
 * report drops to a dim placeholder so it never competes with real readings.
 */
export function Value({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const missing =
    children === null ||
    children === undefined ||
    children === "" ||
    children === "N/A" ||
    children === "None" ||
    children === "\u2014";

  return (
    <span
      className={cn(
        "mt-1 block font-mono text-[13px] font-medium",
        missing ? "text-muted-foreground/60" : "text-foreground",
        className
      )}
    >
      {missing ? "\u2014" : children}
    </span>
  );
}

/**
 * Section marker used inside long detail pages — a mono label with the rule
 * running out to the edge of the column.
 */
export function SectionRule({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("eyebrow-ruled", className)}>{children}</p>;
}
