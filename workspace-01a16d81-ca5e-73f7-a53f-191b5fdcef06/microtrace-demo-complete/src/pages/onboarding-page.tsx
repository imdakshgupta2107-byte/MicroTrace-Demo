import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/brand-logo";
import { RolePick } from "@/components/auth/role-pick";
import { PinLock } from "@/components/auth/pin-lock";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useStudent } from "@/hooks/useStudent";
import { verifyPin } from "@/lib/auth";
import { DEMO_PROFILES } from "@/demo/config";
import { demoStartupError } from "@/demo/seed";
import type { Role } from "@/lib/types";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { role: sessionRole, isUnlocked, unlock } = useAuth();
  const { err } = useToast();
  const { profile, save: saveProfile } = useStudent();
  const [role, setRole] = useState<Role>(() => sessionRole ?? "student");
  const [verified, setVerified] = useState<{ role: Role; pin: string } | null>(null);
  const [name, setName] = useState(() => sessionRole && profile ? profile.name : DEMO_PROFILES[sessionRole ?? "student"].name);
  const [clazz, setClazz] = useState(() => sessionRole && profile ? profile.className : DEMO_PROFILES[sessionRole ?? "student"].className);
  const [submitting, setSubmitting] = useState(false);
  const entering = useRef(false);
  const setupDone = profile?.setupDone === true;
  const pinVerified = verified?.role === role;
  const seedError = demoStartupError();

  // Keep the repaired effect-only redirect and stable auth/profile snapshots.
  useEffect(() => {
    if (isUnlocked && setupDone) navigate("/dashboard", { replace: true });
  }, [isUnlocked, setupDone, navigate]);

  function selectRole(next: Role) {
    setRole(next);
    setVerified(null); // A verified PIN never transfers to a different role.
    // Preset the actual person from the earlier demo so "My requests" is populated.
    setName(DEMO_PROFILES[next].name);
    setClazz(DEMO_PROFILES[next].className);
  }

  function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (entering.current) return;
    if (!name.trim()) {
      err("Tell us your name — it goes on your requests and lab records.");
      return;
    }
    const pin = role === "student" ? "" : pinVerified ? verified.pin : "";
    if (!verifyPin(role, pin)) {
      err("Verify the PIN for your selected role first.");
      return;
    }
    entering.current = true;
    setSubmitting(true);
    try {
      saveProfile({ name: name.trim(), roll: profile?.roll ?? "", className: clazz.trim() });
      if (!unlock(role, pin)) throw new Error("The selected role could not be unlocked.");
      // Navigation happens only in the guarded effect after this update commits.
    } catch (error) {
      entering.current = false;
      setSubmitting(false);
      err(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    }
  }

  return (
    <main className="safe-area-page app-viewport onboarding-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-[0.82fr_1fr] bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        <aside aria-label="About MicroTrace" className="hidden lg:flex flex-col justify-between bg-navy-50 p-9 border-r border-slate-200">
          <div>
            <BrandLogo variant="original" className="w-64 mx-auto rounded-2xl bg-white" />
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[.2em] text-gold-700">Department of Microbiology</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-navy leading-tight">Your lab.<br />One clear view.</h2>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">Coordinate inventory, requests, practicals, equipment and laboratory review in one workspace.</p>
          </div>
          <div className="mt-8 space-y-3 text-xs font-semibold text-slate-600">
            <p className="flex gap-2 items-center"><FlaskConical size={16} className="text-gold-700" /> Inventory, procurement and practical planning</p>
            <p className="flex gap-2 items-center"><ClipboardCheck size={16} className="text-gold-700" /> Role-based operational workflows</p>
          </div>
        </aside>
        <section aria-labelledby="welcome-title" className="min-w-0 p-5 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 rounded-2xl border border-slate-100 bg-white" />
            <div className="min-w-0">
              <h1 id="welcome-title" className="text-2xl font-extrabold text-navy tracking-tight">MicroTrace</h1>
              <p className="text-xs text-slate-500 mt-0.5">Lab inventory &amp; student workbench</p>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-base text-ink">Choose your workspace</h2>
            <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">Select the role that matches the work you need to complete.</p>
          </div>
          <RolePick value={role} onChange={selectRole} />
          {seedError && <p role="alert" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">{seedError}</p>}
          {role !== "student" && !pinVerified && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-3">Enter the access PIN provided for this role.</p>
              <PinLock key={role} role={role} onUnlock={(pin) => setVerified({ role, pin })} />
            </div>
          )}
          {(role === "student" || pinVerified) && (
            <form className="space-y-4" onSubmit={enter} noValidate>
              {pinVerified && <p className="flex items-center gap-2 text-xs font-semibold text-green-700"><CheckCircle2 size={16} className="shrink-0" /> PIN verified. Complete your profile to enter.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="onboarding-name" className="text-xs font-bold text-slate-600">Your name</label>
                  <Input id="onboarding-name" name="name" autoComplete="name" enterKeyHint="next" value={name}
                    maxLength={100} required onChange={(event) => setName(event.target.value)} placeholder="e.g. Aarav Sharma" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="onboarding-class" className="text-xs font-bold text-slate-600">Class / batch (optional)</label>
                  <Input id="onboarding-class" name="class" autoComplete="off" enterKeyHint="done" value={clazz}
                    maxLength={80} onChange={(event) => setClazz(event.target.value)} placeholder="e.g. SY B" />
                </div>
              </div>
              <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Opening MicroTrace…" : `Enter MicroTrace as ${role}`}
              </Button>
              <p className="text-[11px] text-slate-400 leading-relaxed">Your name appears on requests, bookings and laboratory records created during this session.</p>
            </form>
          )}
          <p className="text-[11px] leading-relaxed text-slate-400 border-t border-slate-100 pt-4">MicroTrace · 6.4.1</p>
        </section>
      </div>
    </main>
  );
}
