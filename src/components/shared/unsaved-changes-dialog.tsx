"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
}

export function UnsavedChangesDialog({
  open,
  onStay,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onStay()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-sun" />
            <DialogTitle>You have unsaved changes</DialogTitle>
          </div>
          <DialogDescription>
            Leaving now discards everything you have typed since the last save.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onStay}>
            Keep editing
          </Button>
          <Button variant="destructive" size="sm" onClick={onDiscard}>
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
