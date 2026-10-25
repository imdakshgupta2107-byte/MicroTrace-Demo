import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn("min-h-[80px] min-w-0 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-base sm:text-[13px] outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20 placeholder:text-slate-400", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
