import { ArrowRightLeft, ChevronRight, Settings2, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";

export default function SettingsPage() {
  const { role, lock } = useAuth();
  const { profile } = useStudent();
  return (
    <>
      <PageHeader title="Settings" sub="Profile, session and application preferences." />
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader><CardTitle><UserRound size={17} className="text-gold-700" /> Active profile</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-navy text-white flex items-center justify-center font-bold">{profile?.name.split(" ").map((part: string) => part[0]).join("").slice(0, 2) ?? "MT"}</div>
            <div className="min-w-0"><div className="font-bold text-[13px] text-ink truncate">{profile?.name ?? "MicroTrace user"}</div><div className="text-[11.5px] text-slate-500 capitalize">{role?.replace("-", " ")}</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle><ArrowRightLeft size={17} className="text-gold-700" /> Session</CardTitle></CardHeader>
          <CardContent><Button variant="outline" size="sm" onClick={lock}><ArrowRightLeft size={14} /> Switch role</Button></CardContent>
        </Card>
        <Link to="/details" className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-card transition-colors hover:border-gold/60">
          <span className="flex items-center gap-2 font-bold text-[13px] text-ink"><Settings2 size={17} className="text-gold-700" /> Details</span>
          <ChevronRight size={17} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </>
  );
}
