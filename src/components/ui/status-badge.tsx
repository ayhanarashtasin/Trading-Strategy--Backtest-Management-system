import * as React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";

/**
 * Research status has a direction of travel — idea, through validation, to
 * live or rejected — so the colour follows that progression rather than being
 * chosen per page. Status is always shown as text; colour only reinforces it.
 */
const STATUS_TONE: Record<string, BadgeProps["variant"]> = {
  // Proven
  Live: "success",
  "Production Candidate": "success",
  "OOS Passed": "success",
  "Paper Trading": "success",

  // In flight
  Validation: "warning",
  Candidate: "warning",

  // Early
  Idea: "info",
  Baseline: "info",
  Experimental: "info",

  // Closed
  Rejected: "destructive",
  Archived: "secondary",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  if (!status) return null;
  return (
    <Badge variant={STATUS_TONE[status] ?? "secondary"} className={className}>
      {status}
    </Badge>
  );
}
