import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn("h-11 sm:h-9 w-full sm:w-auto max-w-full min-w-0 rounded-[10px] border border-slate-200 bg-white px-2.5 pr-7 text-base sm:text-[13px] font-medium outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20 appearance-none bg-no-repeat",
        className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235f6a7d' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 8px center" }}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
