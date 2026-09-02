import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The filter rail that sits above every list in the app: one white strip,
 * hairline-ruled, with controls on the left and view switches on the right.
 */
export function Toolbar({
  children,
  trailing,
  className,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-2.5 shadow-plate md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {trailing && (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      )}
    </div>
  );
}

/** A checkbox styled to match the rest of the controls. */
export function ToolbarCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 px-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-input bg-card text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
      {children}
    </label>
  );
}

/** Segmented control for switching how a list is displayed. */
export function ViewSwitch({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          title={opt.label}
          className={cn(
            "rounded p-1.5 transition-colors",
            value === opt.value
              ? "bg-card text-foreground shadow-plate"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.icon}
          <span className="sr-only">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

/** A search field with the magnifier set inside it. */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-[200px] max-w-sm flex-1", className)}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-2.5 text-xs text-foreground shadow-plate transition-colors placeholder:text-muted-foreground/70 hover:border-input/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
      />
    </div>
  );
}
