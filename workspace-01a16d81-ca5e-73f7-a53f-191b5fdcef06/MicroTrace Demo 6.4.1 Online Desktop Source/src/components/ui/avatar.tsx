import { cn } from "@/lib/utils";

const COLORS = { student: "bg-blue-600", teacher: "bg-violet-600", staff: "bg-navy", principal: "bg-gold-600" } as const;

export function initialsOf(name: string): string {
  return name.replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s*/, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function Avatar({ name, role = "student", size = 30, className }: {
  name: string; role?: keyof typeof COLORS; size?: number; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full text-white font-bold shrink-0", COLORS[role], className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initialsOf(name)}
    </span>
  );
}
