import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Badges are read at a glance next to dense figures, so they stay quiet:
   a tinted wash, a hairline, and ink-weight text. No solid fills. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/[0.08] text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/25 bg-destructive/[0.08] text-destructive",
        outline: "border-border bg-card text-muted-foreground",
        success: "border-profit/25 bg-profit/[0.08] text-profit",
        warning: "border-sun/25 bg-sun/[0.09] text-sun",
        info: "border-primary/25 bg-primary/[0.08] text-primary",
        purple: "border-chart-4/25 bg-chart-4/[0.08] text-chart-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/* A span, not a div: badges sit inline beside titles and inside paragraphs. */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
