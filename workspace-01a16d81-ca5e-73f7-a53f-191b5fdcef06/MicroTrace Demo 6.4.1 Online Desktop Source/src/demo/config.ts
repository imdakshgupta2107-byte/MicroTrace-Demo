import legacy from "./legacy-demo.json";
import type { Role } from "@/lib/types";

/** The default build remains the presentation workspace; the live build is selected explicitly. */
export const DEMO_BUILD = import.meta.env.VITE_APP_MODE !== "live";
export const DEMO_STORE_KEY = "microtrace_demo_640_store";
export const DEMO_AUTH_KEY = "microtrace_demo_640_auth";
export const DEMO_PROFILE_KEY = "microtrace_demo_640_profile";
export const DEMO_DEVICE_KEY = "microtrace_demo_640_device";
export const DEMO_BENCH_KEY = "microtrace_demo_640_bench_bookings";
export const DEMO_DATA_EVENT = "mt-demo-data";
export const DEMO_VERSION = "6.4.1";

export const DEMO_PEOPLE = legacy.users.map((person) => ({ ...person, role: person.role as Role }));

export const DEMO_PROFILES: Record<Role, { name: string; className: string; pin: string }> = {
  student: { name: "Aarav Sharma", className: "T.Y. B.Sc. · Batch B", pin: "" },
  teacher: { name: "Dr. Sameer Kulkarni", className: "S.Y. B.Sc.", pin: import.meta.env.VITE_TEACHER_PIN || "2222" },
  staff: { name: "Ms. Rupali Patil", className: "Department of Microbiology", pin: import.meta.env.VITE_STAFF_PIN || "1111" },
  principal: { name: "Dr. Anjali Deshmukh", className: "Department of Microbiology", pin: import.meta.env.VITE_PRINCIPAL_PIN || "0000" },
};
