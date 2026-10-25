import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "default" | "outline" | "green" | "danger" | "ghost";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-600 shadow-sm",
  gold: "bg-gold text-navy font-bold hover:brightness-95 shadow-sm",
  default: "bg-white border border-slate-200 hover:bg-slate-50 text-ink",
  outline: "border border-gold-600 text-gold-700 hover:bg-gold-100",
  green: "bg-green-700 text-white hover:bg-green-800",
  danger: "bg-red-700 text-white hover:bg-red-800",
  ghost: "hover:bg-slate-100 text-slate-600",
};
const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs rounded-lg gap-1",
  md: "h-9 px-3.5 text-[13px] rounded-[10px] gap-1.5",
  lg: "h-11 px-5 text-sm rounded-xl gap-2",
  icon: "h-8 w-8 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref} type={type}
      className={cn("touch-button inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none", VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
