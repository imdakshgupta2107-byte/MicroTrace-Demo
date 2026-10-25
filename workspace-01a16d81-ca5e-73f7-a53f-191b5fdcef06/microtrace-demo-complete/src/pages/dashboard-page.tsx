import { RouteRedirect } from "@/components/auth/route-redirect";
// dashboard-page — routes to the right role dashboard.
import { useAuth } from "@/hooks/useAuth";
import { DashboardWelcome } from "@/components/layout/dashboard-welcome";
import { PageHeader } from "@/components/layout/page-header";
import { StudentScreen } from "@/screens/student-screen";
import { TeacherScreen } from "@/screens/teacher-screen";
import { StaffScreen } from "@/screens/staff-screen";
import { PrincipalScreen } from "@/screens/principal-screen";
import { displayName } from "@/lib/student";

const TITLES = {
  student: "Student dashboard", teacher: "Teacher dashboard",
  staff: "Lab-staff dashboard", principal: "Principal dashboard",
} as const;

export function DashboardPage() {
  const { role } = useAuth();
  if (!role) return <RouteRedirect to="/onboarding" replace />;
  return (
    <>
      <PageHeader title={TITLES[role]} sub={`Signed in as ${displayName()} · ${role}`} />
      <DashboardWelcome role={role} />
      {role === "student" && <StudentScreen />}
      {role === "teacher" && <TeacherScreen />}
      {role === "staff" && <StaffScreen />}
      {role === "principal" && <PrincipalScreen />}
    </>
  );
}
