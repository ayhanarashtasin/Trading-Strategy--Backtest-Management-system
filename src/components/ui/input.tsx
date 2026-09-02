import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground shadow-plate transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/70",
          "hover:border-input/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
