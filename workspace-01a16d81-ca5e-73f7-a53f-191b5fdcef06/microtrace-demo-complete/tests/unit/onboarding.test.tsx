import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/pages/onboarding-page";
import { ToastHost } from "@/components/layout/toast-host";
import { AUTH_STORAGE_KEY, lock, readAuth, unlock } from "@/lib/auth";
import { readStudent, saveStudent, STUDENT_STORAGE_KEY } from "@/lib/student";

beforeEach(() => { localStorage.clear(); lock(); });

function mount() {
  return render(<StrictMode><MemoryRouter initialEntries={["/onboarding"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/onboarding" element={<OnboardingPage />} /><Route path="/dashboard" element={<h1>Dashboard reached</h1>} /></Routes>
    <ToastHost />
  </MemoryRouter></StrictMode>);
}

describe("OnboardingPage", () => {
  it("prefills the correct sample person after a different role is locked, without rewriting the profile", async () => {
    const user = userEvent.setup();
    saveStudent({ name: "Ms. Rupali Patil", roll: "", className: "Staff" });
    mount();
    expect(screen.getByLabelText("Your name")).toHaveValue("Aarav Sharma");
    expect(readStudent()?.name).toBe("Ms. Rupali Patil");
    await user.click(screen.getByRole("button", { name: /^Teacher/ }));
    await user.type(screen.getByLabelText("Teacher PIN"), "2222");
    await user.click(screen.getByRole("button", { name: "Verify PIN" }));
    expect(screen.getByLabelText("Your name")).toHaveValue("Dr. Sameer Kulkarni");
    expect(readAuth().role).toBeNull();
    expect(readStudent()?.name).toBe("Ms. Rupali Patil");
  });

  it("stays mounted without React rendering warnings", async () => {
    const errors = vi.spyOn(console, "error");
    mount();
    await screen.findByRole("heading", { name: "MicroTrace" });
    expect(errors.mock.calls).toEqual([]);
    expect(readAuth().role).toBeNull();
  });

  it("does not unlock or navigate when a student submits an empty name", async () => {
    const user = userEvent.setup();
    mount();
    await user.clear(screen.getByLabelText("Your name"));
    await user.click(screen.getByRole("button", { name: "Enter MicroTrace as student" }));
    expect(readAuth().role).toBeNull();
    expect(readStudent()).toBeNull();
    expect(screen.getByRole("heading", { name: "MicroTrace" })).toBeInTheDocument();
    expect(screen.getByText(/Tell us your name/)).toBeInTheDocument();
  });

  it("saves a student profile, unlocks once, then redirects from the effect", async () => {
    const user = userEvent.setup();
    const events = vi.fn();
    window.addEventListener("mt-auth", events);
    mount();
    await user.clear(screen.getByLabelText("Your name"));
    await user.type(screen.getByLabelText("Your name"), "Anaya Patil");
    await user.clear(screen.getByLabelText("Class / batch (optional)"));
    await user.type(screen.getByLabelText("Class / batch (optional)"), "SY B");
    await user.click(screen.getByRole("button", { name: "Enter MicroTrace as student" }));
    await screen.findByRole("heading", { name: "Dashboard reached" });
    expect(readAuth().role).toBe("student");
    expect(readStudent()).toMatchObject({ name: "Anaya Patil", className: "SY B", setupDone: true });
    expect(events).toHaveBeenCalledTimes(1);
    window.removeEventListener("mt-auth", events);
  });

  it.each([['Lab staff', 'staff', '1111'], ['Teacher', 'teacher', '2222'], ['Principal', 'principal', '0000']] as const)("stages the %s PIN without a premature auth write", async (label, role, pin) => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));
    const input = screen.getByLabelText(`${label} PIN`);
    await user.type(input, "9999");
    await user.click(screen.getByRole("button", { name: "Verify PIN" }));
    expect(input).toHaveValue("");
    expect(readAuth().role).toBeNull();
    await user.type(input, pin);
    await user.click(screen.getByRole("button", { name: "Verify PIN" }));
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/PIN verified/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Your name"));
    await user.type(screen.getByLabelText("Your name"), "Lab User");
    await user.click(screen.getByRole("button", { name: `Enter MicroTrace as ${role}` }));
    await screen.findByRole("heading", { name: "Dashboard reached" });
    expect(readAuth().role).toBe(role);
  });

  it("requires a fresh PIN after changing a privileged role", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: /^Lab staff/ }));
    await user.type(screen.getByLabelText("Lab staff PIN"), "1111");
    await user.click(screen.getByRole("button", { name: "Verify PIN" }));
    await user.click(screen.getByRole("button", { name: /^Teacher/ }));
    expect(screen.getByLabelText("Teacher PIN")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Enter MicroTrace as teacher" })).toBeNull();
    expect(readAuth().role).toBeNull();
  });

  it("redirects an already-completed saved session only after commit", async () => {
    saveStudent({ name: "Saved Student", roll: "", className: "" });
    unlock("student", "");
    mount();
    await screen.findByRole("heading", { name: "Dashboard reached" });
  });

  it("starts safely with corrupt auth and profile data", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "{broken");
    localStorage.setItem(STUDENT_STORAGE_KEY, "{broken");
    mount();
    await screen.findByRole("heading", { name: "MicroTrace" });
    expect(readAuth().role).toBeNull();
    expect(screen.getByLabelText("Your name")).toHaveValue("Aarav Sharma");
  });

  it("keeps the form usable and auth locked if profile persistence fails", async () => {
    const user = userEvent.setup();
    mount();
    await user.type(screen.getByLabelText("Your name"), "Anaya");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    await user.click(screen.getByRole("button", { name: "Enter MicroTrace as student" }));
    await waitFor(() => expect(screen.getByText(/Unable to save your profile/)).toBeInTheDocument());
    expect(readAuth().role).toBeNull();
    expect(screen.getByRole("button", { name: "Enter MicroTrace as student" })).toBeEnabled();
  });
});
