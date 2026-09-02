"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Drawer({
  open,
  onOpenChange,
  children,
  title,
  description,
  size = "lg",
}: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-3xl",
    full: "max-w-5xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      <div
        className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={() => onOpenChange(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className={cn(
            "flex w-screen flex-col border-l border-border bg-card shadow-float animate-in slide-in-from-right duration-200",
            sizeClasses[size]
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/40 px-6 py-4">
            <div className="min-w-0">
              {title && (
                <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close drawer</span>
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
