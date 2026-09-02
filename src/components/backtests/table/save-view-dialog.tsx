"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Bookmark, AlertCircle, Check } from "lucide-react";
import { FilterState } from "./filter-panel";

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: FilterState;
  onSaved?: () => void;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  currentFilters,
  onSaved,
}: SaveViewDialogProps) {
  const { user, isOwner } = useAuth();
  const supabase = createClient();

  const [viewName, setViewName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewName.trim()) {
      setError("Please provide a name for this saved view.");
      return;
    }
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from("saved_views").insert({
        user_id: user.id,
        name: viewName.trim(),
        is_shared: isShared,
        filters: currentFilters,
        sort_config: [],
        column_visibility: {},
        column_order: [],
        column_pinning: {},
      });

      if (insertErr) throw insertErr;

      setViewName("");
      setIsShared(false);
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save view.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Bookmark className="h-5 w-5 text-primary" />
            <DialogTitle>Save this view</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Stores the filters you have set right now so you can bring them back in one click.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center space-x-1.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="eyebrow block">View Name</label>
            <Input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. Strong Candidates, 15m Supertrend, Low Drawdown"
              required
              autoFocus
            />
          </div>

          {isOwner && (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="is_shared"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
              />
              <label htmlFor="is_shared" className="text-xs text-foreground cursor-pointer select-none">
                Share this view with the team
              </label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="xs"
              variant="default"
              disabled={loading || !viewName.trim()}
              className="gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              {loading ? "Saving..." : "Save view"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
