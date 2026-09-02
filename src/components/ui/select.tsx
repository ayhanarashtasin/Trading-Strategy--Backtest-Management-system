import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

/* Native select, restyled. The chevron is drawn inline so the control matches
   the input field exactly instead of inheriting the OS arrow box. */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-9 w-full appearance-none rounded-md border border-input bg-card py-1 pl-3 pr-8 text-sm text-foreground shadow-plate transition-colors",
          "bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat",
          "hover:border-input/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
