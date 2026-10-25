import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("touch-input h-11 sm:h-9 min-w-0 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-base sm:text-[13px] outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20 placeholder:text-slate-400", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
