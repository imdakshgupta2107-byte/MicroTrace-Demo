import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStudent } from "@/hooks/useStudent";
import { useToast } from "@/hooks/useToast";

export function ProfileChip() {
  const { profile, save: saveProfile } = useStudent();
  const [name, setName] = useState(profile?.name ?? "");
  const [clazz, setClazz] = useState(profile?.className ?? "");
  const { toast, err } = useToast();
  useEffect(() => {
    setName(profile?.name ?? "");
    setClazz(profile?.className ?? "");
  }, [profile?.name, profile?.className]);

  function save() {
    if (!name.trim()) return err("Name can't be empty.");
    try {
      saveProfile({ name: name.trim(), roll: profile?.roll ?? "", className: clazz.trim() });
      toast(`Saved — you'll appear as ${name.trim()}.`);
    } catch (error) {
      err(error instanceof Error ? error.message : "Could not save your profile.");
    }
  }
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-3">
      <div className="font-bold text-sm text-ink">Your profile</div>
      <div className="flex flex-wrap gap-2">
        <Input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="Full name" aria-label="Profile name" className="w-full sm:w-52" />
        <Input value={clazz} maxLength={80} onChange={(event) => setClazz(event.target.value)} placeholder="Class (e.g. SY B)" aria-label="Profile class" className="w-full sm:w-36" />
        <Button variant="primary" onClick={save}>Save profile</Button>
      </div>
      <p className="text-xs text-slate-500">Used on your chemical requests and approval trails. Stored on this device only.</p>
    </div>
  );
}
