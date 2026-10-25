import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyPin } from "@/lib/auth";
import type { Role } from "@/lib/types";

export type { Role };

const LABELS: Record<Role, string> = {
  student: "Student", teacher: "Teacher", staff: "Lab staff", principal: "Principal",
};

/** PIN verification is staged; OnboardingPage commits auth after profile validation. */
export function PinLock({ role, onUnlock }: { role: Role; onUnlock: (pin: string) => void }) {
  const id = useId();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pin.trim();
    if (!verifyPin(role, value)) {
      setError(`Wrong PIN for ${LABELS[role].toLowerCase()}. Please try again.`);
      setPin("");
      return;
    }
    onUnlock(value);
  }

  if (role === "student") return null;
  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-xs font-bold text-slate-600">{LABELS[role]} PIN</label>
        <Input id={id} type="password" inputMode="numeric" autoComplete="off" enterKeyHint="done"
          value={pin} maxLength={32} placeholder="Enter your role PIN" aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => { setPin(event.target.value); setError(null); }} />
        {error && <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
      <Button type="submit" variant="primary" className="w-full" disabled={!pin.trim()}>Verify PIN</Button>
    </form>
  );
}
