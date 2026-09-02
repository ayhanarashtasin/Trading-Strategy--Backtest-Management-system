"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [tabValue, setTabValue] = React.useState(defaultValue || "");
  const currentValue = value !== undefined ? value : tabValue;

  const handleValueChange = React.useCallback(
    (v: string) => {
      if (onValueChange) onValueChange(v);
      setTabValue(v);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider
      value={{ value: currentValue, onValueChange: handleValueChange }}
    >
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

/* Tabs are set as a ruled strip rather than a pill group — closer to the
   section dividers used through the rest of the record. */
export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-stretch gap-1 overflow-x-auto border-b border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  disabled,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "relative -mb-px inline-flex items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45",
        isSelected
          ? "border-primary font-semibold text-primary"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn(
        "focus-visible:outline-none animate-in fade-in-50 duration-150",
        className
      )}
    >
      {children}
    </div>
  );
}
