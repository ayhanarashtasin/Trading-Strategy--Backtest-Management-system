"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ALL_COLUMN_METADATA } from "./column-definitions";
import { Sliders, Pin, Eye, EyeOff, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";

interface ColumnSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnVisibility: Record<string, boolean>;
  onVisibilityChange: (colId: string, visible: boolean) => void;
  columnOrder: string[];
  onOrderChange: (newOrder: string[]) => void;
  columnPinning: { left?: string[]; right?: string[] };
  onPinningChange: (colId: string, position: "left" | "right" | false) => void;
  onResetToDefault: () => void;
  columnsMetadata?: Array<{ id: string; label: string; defaultVisible: boolean; category: string }>;
}

export function ColumnSettingsDialog({
  open,
  onOpenChange,
  columnVisibility,
  onVisibilityChange,
  columnOrder,
  onOrderChange,
  columnPinning,
  onPinningChange,
  onResetToDefault,
  columnsMetadata,
}: ColumnSettingsDialogProps) {
  // Move column up or down in order
  const moveColumn = (colId: string, direction: "up" | "down") => {
    const currentIndex = columnOrder.indexOf(colId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= columnOrder.length) return;

    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    onOrderChange(newOrder);
  };

  const metadata = columnsMetadata || ALL_COLUMN_METADATA;
  const categories = Array.from(new Set(metadata.map((c) => c.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88dvh] p-0 flex flex-col" onClose={() => onOpenChange(false)}>
        <div className="p-4 sm:p-6 border-b border-border bg-card pr-12">
          <DialogHeader className="mb-0">
            <div className="flex items-center space-x-2">
              <Sliders className="h-5 w-5 text-primary shrink-0" />
              <DialogTitle className="text-sm sm:text-base">Table Column Layout & Settings</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Show, hide, reorder and pin columns. Your layout saves to your
              account, so it comes back the next time you sign in.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Categories Grid */}
          {categories.map((category) => {
            const cols = metadata.filter((c) => c.category === category && c.id !== "select");
            if (cols.length === 0) return null;

            return (
              <div key={category} className="space-y-2">
                <p className="eyebrow-ruled">{category}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {cols.map((col) => {
                    const isVisible = columnVisibility[col.id] ?? col.defaultVisible;
                    const isPinnedLeft = columnPinning.left?.includes(col.id);
                    const isPinnedRight = columnPinning.right?.includes(col.id);

                    return (
                      <div
                        key={col.id}
                        className={`flex items-center justify-between gap-2 rounded-md border p-2 transition-colors ${
                          isVisible
                            ? "border-border bg-card text-foreground"
                            : "border-border bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        {/* Visibility Checkbox */}
                        <label className="flex min-w-0 cursor-pointer select-none items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) =>
                              onVisibilityChange(col.id, e.target.checked)
                            }
                            className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                          />
                          <span className="truncate text-xs font-medium">
                            {col.label}
                          </span>
                        </label>

                        {/* Pin Controls & Move Controls */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => moveColumn(col.id, "up")}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="Move earlier"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveColumn(col.id, "down")}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="Move later"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onPinningChange(
                                col.id,
                                isPinnedLeft ? false : "left"
                              )
                            }
                            className={`rounded p-1 transition-colors ${
                              isPinnedLeft
                                ? "bg-primary/[0.1] text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                            title={isPinnedLeft ? "Unpin" : "Pin to the left"}
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border bg-muted/40 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onResetToDefault}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset layout
            </Button>

            <Button
              type="button"
              size="xs"
              variant="default"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
