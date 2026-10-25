import { Link } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { demoStartupError } from "@/demo/seed";

export function DemoBanner() {
  const error = demoStartupError();
  return (
    <div className="mb-4 rounded-xl border border-gold/25 bg-gold-100/60 px-3 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-gold-700">
      <span className="inline-flex items-center gap-2 font-semibold"><WifiOff size={13} className="shrink-0" /> Demo lab · sample records · local to this device</span>
      <Link to="/settings" className="font-bold underline underline-offset-2">Demo controls</Link>
      {error && <p role="alert" className="basis-full mt-1">{error}</p>}
    </div>
  );
}
