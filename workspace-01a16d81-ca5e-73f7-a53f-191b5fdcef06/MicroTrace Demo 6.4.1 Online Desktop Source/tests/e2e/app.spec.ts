import { test as base, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { unzipSync } from "fflate";

const AUTH = "microtrace_demo_640_auth";
const PROFILE = "microtrace_demo_640_profile";
const STORE = "microtrace_demo_640_store";

const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/Maximum update depth|result of getSnapshot|Cannot update a component|Too many re-renders|Minified React error|change in the order of Hooks/.test(message.text())) {
        errors.push(message.text());
      }
    });
    await use(errors);
    expect(errors, "No React runtime errors or snapshot/render-loop warnings").toEqual([]);
  }, { auto: true }],
});

type Role = "student" | "teacher" | "staff" | "principal";
const labels: Record<Role, string> = { student: "Student", teacher: "Teacher", staff: "Lab staff", principal: "Principal" };
const pins: Partial<Record<Role, string>> = { staff: "1111", teacher: "2222", principal: "0000" };
const pageNames: Record<string, string> = {
  Automations: "Automation centre", Dashboard: "dashboard", Inventory: "Lab inventory", Containers: "Containers", Requests: "Requests",
  Practicals: "Practicals", Workbench: "The Workbench", Details: "Details", Settings: "Settings", Procurement: "Procurement",
  Vendors: "Vendors", Reports: "Reports", "Audit Log": "Audit trail",
  Bookings: "Instrument bookings", "Breakage & waste": "Breakage & waste", Registers: "Verification registers",
};

async function signIn(page: Page, role: Role, name = "Test Lab User", navigate = true) {
  if (navigate) await page.goto("/onboarding");
  await page.getByRole("button", { name: new RegExp(`^${labels[role]}`) }).click();
  if (role !== "student") {
    await page.getByLabel(`${labels[role]} PIN`).fill(pins[role]!);
    await page.getByRole("button", { name: "Verify PIN", exact: true }).click();
  }
  await page.getByLabel("Your name", { exact: true }).fill(name);
  await page.getByLabel("Class / batch (optional)").fill("SY B");
  await page.getByRole("button", { name: `Enter MicroTrace as ${role}`, exact: true }).click();
  await expect(page.locator("main h1")).toContainText("dashboard");
}

async function openPage(page: Page, label: string) {
  const sidebar = page.getByTestId("desktop-sidebar");
  if (await sidebar.isVisible()) {
    await sidebar.getByRole("link", { name: label, exact: true }).click();
  } else {
    await page.getByRole("button", { name: "More pages", exact: true }).click();
    await page.getByRole("navigation", { name: "All pages", exact: true }).getByRole("link", { name: label, exact: true }).click();
  }
  await expect(page.locator("main h1")).toContainText(pageNames[label]);
}

async function assertFitsViewport(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll, "No document-level horizontal overflow").toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function localStore(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), STORE);
}

test("fresh onboarding is stable, empty submission does not authenticate", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "MicroTrace", exact: true })).toBeVisible();
  await page.getByLabel("Your name", { exact: true }).fill("");
  await page.getByRole("button", { name: "Enter MicroTrace as student" }).click();
  await expect(page.getByRole("alert")).toContainText("Tell us your name");
  expect(await page.evaluate((key) => localStorage.getItem(key), AUTH)).toBeNull();
  await assertFitsViewport(page);
  await page.waitForTimeout(600);
  await expect(page.getByRole("heading", { name: "MicroTrace", exact: true })).toBeVisible();
});

test("wrong PIN and switching roles never create a premature session", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /^Lab staff/ }).click();
  await page.getByLabel("Lab staff PIN").fill("9999");
  await page.getByRole("button", { name: "Verify PIN" }).click();
  await expect(page.getByRole("alert")).toContainText("Wrong PIN");
  await page.getByLabel("Lab staff PIN").fill("1111");
  await page.getByRole("button", { name: "Verify PIN" }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), AUTH)).toBeNull();
  await page.getByRole("button", { name: /^Teacher/ }).click();
  await expect(page.getByLabel("Teacher PIN")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Enter MicroTrace as teacher" })).toHaveCount(0);
  await signIn(page, "teacher", "Teacher User", false);
});

const allowedPages: Record<Role, string[]> = {
  student: ["Dashboard", "Inventory", "Containers", "Requests", "Practicals", "Bookings", "Breakage & waste", "Registers", "Workbench", "Details", "Settings"],
  teacher: ["Dashboard", "Inventory", "Containers", "Requests", "Practicals", "Bookings", "Breakage & waste", "Registers", "Workbench", "Reports", "Details", "Settings"],
  staff: ["Dashboard", "Inventory", "Containers", "Requests", "Procurement", "Vendors", "Practicals", "Bookings", "Breakage & waste", "Registers", "Reports", "Audit Log", "Details", "Settings"],
  principal: ["Dashboard", "Inventory", "Containers", "Requests", "Procurement", "Vendors", "Practicals", "Bookings", "Breakage & waste", "Registers", "Reports", "Audit Log", "Details", "Settings"],
};

for (const role of Object.keys(allowedPages) as Role[]) {
  test(`${role}: every allowed page is reachable, responsive and safe after reload`, async ({ page }, testInfo) => {
    await signIn(page, role);
    const mobile = (page.viewportSize()?.width ?? 0) < 768;
    if (mobile) {
      await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
      await expect(page.getByTestId("desktop-sidebar")).toBeHidden();
    } else {
      await expect(page.getByTestId("desktop-sidebar")).toBeVisible();
      await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden();
    }
    for (const label of allowedPages[role]) {
      await openPage(page, label);
      await assertFitsViewport(page);
      await page.reload();
      await expect(page.locator("main h1")).toContainText(pageNames[label]);
      await assertFitsViewport(page);
    }
    if (role === "staff") await page.screenshot({ path: testInfo.outputPath("staff-settings.png"), fullPage: true });
    await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "MicroTrace", exact: true })).toBeVisible();
  });
}

test("all eleven workbench tools open without runtime errors", async ({ page }) => {
  await signIn(page, "student");
  await openPage(page, "Workbench");
  for (const name of ["Dilution", "Molar solution", "Media prep", "CFU counter", "Haemocytometer", "Cell seeding", "Lab timers", "96-well map", "Doubling time", "Unit converter", "Percent solution"]) {
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    await expect(page.getByRole("button", { name: "Back to the bench" })).toBeVisible();
    await assertFitsViewport(page);
    await page.getByRole("button", { name: "Back to the bench" }).click();
  }
});

test("logged-out protected routes return safely to onboarding", async ({ page }) => {
  await page.goto("/workbench");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
});

test("corrupt stored auth and profile cannot blank the app", async ({ page }) => {
  await page.addInitScript(([auth, profile]) => {
    localStorage.setItem(auth, "{invalid"); localStorage.setItem(profile, "{invalid");
  }, [AUTH, PROFILE]);
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "MicroTrace", exact: true })).toBeVisible();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("Aarav Sharma");
});

test("native Android bootstrap uses reload-safe hash routes and skips web PWA registration", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "androidBridge", { value: { postMessage: () => undefined } });
  });
  await page.goto("/#/onboarding");
  await signIn(page, "student", "Native Test User", false);
  await expect(page).toHaveURL(/#\/dashboard$/);
  await page.reload();
  await expect(page.locator("main h1")).toContainText("Student dashboard");
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});

test("locking one tab updates another tab without a snapshot loop", async ({ page, context }) => {
  await signIn(page, "student");
  const second = await context.newPage();
  const errors: string[] = [];
  second.on("pageerror", (error) => errors.push(error.message));
  await second.goto("/dashboard");
  await expect(second.locator("main h1")).toContainText("Student dashboard");
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await expect(second).toHaveURL(/\/onboarding$/);
  await expect(second.getByRole("heading", { name: "MicroTrace", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await second.close();
});

test("web PWA reloads and runs the workbench fully offline after first load", async ({ page, context }) => {
  test.skip(process.env.E2E_DEV === "1", "Service worker is enabled only in production builds.");
  await signIn(page, "student");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator("main h1")).toContainText("Student dashboard");
    await openPage(page, "Workbench");
    await page.getByRole("button", { name: /^Dilution/ }).click();
    await expect(page.getByRole("button", { name: "Back to the bench" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("inventory -> student request -> staff issue persists across role switches and reloads", async ({ page }) => {
  await signIn(page, "staff", "Lab Manager");
  const baseline = await localStore(page);
  await openPage(page, "Inventory");
  await page.getByRole("button", { name: "Add item", exact: true }).first().click();
  let dialog = page.getByRole("dialog");
  await assertFitsViewport(page);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.getByPlaceholder("e.g. Ethanol 95%").fill("Test Ethanol");
  await dialog.getByRole("button", { name: "Add item", exact: true }).click();
  await expect.poll(async () => (await localStore(page)).chemicals?.length).toBe(baseline.chemicals.length + 1);
  const chemicalId = (await localStore(page)).chemicals[0].id;
  await assertFitsViewport(page);
  await openPage(page, "Containers");
  await page.getByRole("button", { name: "Add container", exact: true }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.locator("select").first().selectOption(chemicalId);
  await dialog.getByPlaceholder("e.g. Bottle 1 · M1 cupboard").fill("Bottle A");
  await dialog.locator('input[type="number"]').nth(0).fill("100");
  await dialog.locator('input[type="number"]').nth(1).fill("100");
  await dialog.getByPlaceholder("e.g. Chem Store A · Shelf 1").fill("Shelf A");
  await dialog.getByRole("button", { name: "Add container", exact: true }).click();
  await expect.poll(async () => (await localStore(page)).containers?.length).toBe(baseline.containers.length + 1);
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await signIn(page, "student", "Anaya Patil", false);
  await openPage(page, "Requests");
  await page.getByRole("button", { name: "New request", exact: true }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.locator("select").selectOption(chemicalId);
  await dialog.locator('input[type="number"]').fill("5");
  await dialog.getByPlaceholder("e.g. Gram staining practical, batch A").fill("Gram staining practical");
  await dialog.getByRole("button", { name: "Submit request", exact: true }).click();
  await expect.poll(async () => (await localStore(page)).requests?.[0]?.status).toBe("pending");
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await signIn(page, "staff", "Lab Manager", false);
  await openPage(page, "Requests");
  const requestId = (await localStore(page)).requests[0].id;
  await page.locator(`[data-request-id="${requestId}"]`).getByRole("button", { name: "Approve & issue", exact: true }).click();
  await expect.poll(async () => (await localStore(page)).requests?.[0]?.status).toBe("issued");
  expect((await localStore(page)).containers[0].qty).toBe(95);
  await assertFitsViewport(page);
  expect((await localStore(page)).audit_log.length).toBeGreaterThanOrEqual(baseline.audit_log.length + 4);
  await page.reload();
  await expect(page.locator("main h1")).toContainText("Requests");
  await expect(page.getByText("issued", { exact: true }).first()).toBeVisible();
});

test("Lab Desk separates issue reports from requirements and never deducts stock silently", async ({ page }) => {
  await signIn(page, "student", "Anaya Reporter");
  const before = (await localStore(page)).containers.find((container: { chemical_id: string }) => container.chemical_id === "it-01").qty;
  await openPage(page, "Requests");
  await page.getByRole("button", { name: "Report an issue", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("What did you observe?").fill("Ethanol level is below the marked scale");
  await dialog.getByLabel("Station / bay / cupboard").fill("Bay 1 dispensing bench");
  await dialog.getByLabel("Observed condition and immediate action").fill("Observed before class; bottle left in place for a physical audit.");
  await dialog.getByRole("button", { name: "Submit issue report", exact: true }).click();
  const reportId = (await localStore(page)).service_tickets[0].id;
  await page.getByRole("button", { name: "Request material", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("What do you need?").fill("E. coli culture for Batch B");
  await dialog.getByLabel("Academic purpose, batch or research context").fill("Required for the supervised Batch B inoculation practical.");
  await dialog.getByRole("button", { name: "Submit requirement", exact: true }).click();
  const requirementId = (await localStore(page)).service_tickets[0].id;
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await signIn(page, "teacher", "Teacher Reviewer", false);
  await openPage(page, "Requests");
  await page.locator(`[data-service-ticket-id="${requirementId}"]`).getByRole("button", { name: "Endorse for lab staff", exact: true }).click();
  await expect.poll(async () => (await localStore(page)).service_tickets.find((ticket: { id: string }) => ticket.id === requirementId)?.status).toBe("endorsed");
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await signIn(page, "staff", "Lab Manager", false);
  await openPage(page, "Requests");
  const report = page.locator(`[data-service-ticket-id="${reportId}"]`);
  await report.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await report.getByRole("button", { name: "Start physical review", exact: true }).click();
  await report.getByRole("button", { name: "Resolve report", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Recorded note").fill("Bottle checked and referred to the controlled count workflow.");
  await dialog.getByRole("button", { name: "Save outcome", exact: true }).click();
  const requirement = page.locator(`[data-service-ticket-id="${requirementId}"]`);
  await requirement.getByRole("button", { name: "Start fulfilment", exact: true }).click();
  await requirement.getByRole("button", { name: "Mark fulfilled", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Recorded note").fill("Culture preparation queued; custody issue will be recorded separately.");
  await dialog.getByRole("button", { name: "Save outcome", exact: true }).click();
  const store = await localStore(page);
  expect(store.service_tickets.find((ticket: { id: string }) => ticket.id === reportId).status).toBe("resolved");
  expect(store.service_tickets.find((ticket: { id: string }) => ticket.id === requirementId).status).toBe("fulfilled");
  expect(store.containers.find((container: { chemical_id: string }) => container.chemical_id === "it-01").qty).toBe(before);
});

test("Excel export produces a real OOXML ZIP document", async ({ page }) => {
  await signIn(page, "staff");
  await openPage(page, "Reports");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Register .xlsx", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  const downloaded = await download.path();
  expect(downloaded).not.toBeNull();
  const files = unzipSync(new Uint8Array(fs.readFileSync(downloaded!)));
  expect(files["[Content_Types].xml"]).toBeDefined();
  expect(files["xl/workbook.xml"]).toBeDefined();
  expect(files["xl/worksheets/sheet1.xml"]).toBeDefined();
  expect(new TextDecoder().decode(files["xl/worksheets/sheet1.xml"])).toContain("Ethanol 95%");
});

test("fresh demo bundles the actual earlier records and supplied logo without external data requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== "127.0.0.1") external.push(request.url());
  });
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "MicroTrace", exact: true })).toBeVisible();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("Aarav Sharma");
  const demo = await localStore(page);
  for (const [key, count] of Object.entries({ chemicals: 38, containers: 38, requests: 5, vendors: 4, vendor_prices: 51,
    purchase_orders: 3, practicals: 2, instrument_bookings: 2, discrepancies: 1, audit_log: 8, demo_users: 7 })) {
    expect(demo[key], `Original ${key} records are bundled`).toHaveLength(count);
  }
  expect(demo.chemicals[0].name).toBe("Ethanol 95%");
  expect(demo.containers[0].qty).toBe(18);
  expect(demo.containers[0].barcode).toBe("8906001000001");
  const logo = page.locator('img[alt="MicroTrace logo"]:visible').first();
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), AUTH)).toBeNull();
  expect(external).toEqual([]);
  await assertFitsViewport(page);
});

test("demo edits persist; explicit confirmed restore keeps profile and non-demo data untouched", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("microtrace_v3_store")) localStorage.setItem("microtrace_v3_store", "keep-real-inventory");
  });
  await signIn(page, "principal", "Dr. Anjali Deshmukh");
  const original = await localStore(page);
  original.containers[0].qty = 7;
  await page.evaluate(([key, snapshot]) => localStorage.setItem(key, snapshot), [STORE, JSON.stringify(original)]);
  await page.reload();
  expect((await localStore(page)).containers[0].qty).toBe(7);
  const savedProfile = await page.evaluate((key) => localStorage.getItem(key), PROFILE);
  await openPage(page, "Details");
  await page.getByRole("button", { name: "Records & maintenance", exact: true }).click();
  await page.getByRole("button", { name: "Restore original demo data", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Restore original demo data" });
  await expect(dialog.getByRole("button", { name: "Reset demo data", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Keep my changes" }).click();
  expect((await localStore(page)).containers[0].qty).toBe(7);
  await page.getByRole("button", { name: "Restore original demo data", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Restore original demo data" });
  await dialog.getByRole("checkbox").check();
  await assertFitsViewport(page);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.getByRole("button", { name: "Reset demo data", exact: true }).click();
  await expect.poll(async () => (await localStore(page)).containers[0].qty).toBe(18);
  expect((await localStore(page)).chemicals).toHaveLength(38);
  expect(await page.evaluate((key) => localStorage.getItem(key), PROFILE)).toBe(savedProfile);
  expect(await page.evaluate(() => localStorage.getItem("microtrace_v3_store"))).toBe("keep-real-inventory");
  await expect(page.getByRole("region", { name: "Demo data", exact: true }).getByText("38", { exact: true }).first()).toBeVisible();
  await page.reload();
  expect((await localStore(page)).containers[0].qty).toBe(18);
});

test("restored instrument bookings support conflicts, student request, staff approval and cancellation", async ({ page }) => {
  await signIn(page, "student", "Aarav Sharma");
  const initial = await localStore(page);
  const occupiedDate = initial.instrument_bookings[0].date as string;
  const freeDate = new Date(Date.parse(occupiedDate + "T12:00:00Z") + 2 * 86400000).toISOString().slice(0, 10);
  await openPage(page, "Bookings");
  await expect(page.locator('[data-booking-id="bk-1"]')).toContainText("Autoclave, vertical 50 L");
  await expect(page.getByRole("button", { name: "Approve booking" })).toHaveCount(0);
  await page.getByRole("button", { name: "New booking", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "New instrument booking" });
  await dialog.getByLabel("Instrument", { exact: true }).selectOption("it-24");
  await dialog.getByLabel("Booking date").fill(occupiedDate);
  await expect(dialog.getByRole("button", { name: /^09:00–11:00/ })).toBeDisabled();
  await dialog.getByLabel("Booking date").fill(freeDate);
  await dialog.getByRole("button", { name: "13:00–15:00", exact: true }).click();
  await dialog.getByLabel("Purpose", { exact: true }).fill("Demo reservation workflow");
  await assertFitsViewport(page);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.getByRole("button", { name: "Reserve instrument", exact: true }).click();
  await expect.poll(async () => (await localStore(page)).instrument_bookings.length).toBe(3);
  const bookingId = (await localStore(page)).instrument_bookings.find((booking: { purpose: string }) => booking.purpose === "Demo reservation workflow").id;
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await signIn(page, "staff", "Ms. Rupali Patil", false);
  await openPage(page, "Bookings");
  await page.locator(`[data-booking-id="${bookingId}"]`).getByRole("button", { name: "Approve booking" }).click();
  await expect.poll(async () => (await localStore(page)).instrument_bookings.find((booking: { id: string }) => booking.id === bookingId).status).toBe("approved");
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await signIn(page, "student", "Aarav Sharma", false);
  await openPage(page, "Bookings");
  await page.locator(`[data-booking-id="${bookingId}"]`).getByRole("button", { name: "Cancel booking" }).click();
  dialog = page.getByRole("dialog", { name: "Cancel instrument booking" });
  await dialog.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect.poll(async () => (await localStore(page)).instrument_bookings.find((booking: { id: string }) => booking.id === bookingId).status).toBe("cancelled");
  await page.getByLabel("Show bookings").selectOption("all");
  await expect(page.locator(`[data-booking-id="${bookingId}"]`)).toContainText("cancelled");
  expect((await localStore(page)).containers).toEqual(initial.containers);
  await assertFitsViewport(page);
});

test("the original breakage report is visible and staff can write off exactly three tubes", async ({ page }) => {
  await signIn(page, "student", "Aarav Sharma");
  await openPage(page, "Breakage & waste");
  await expect(page.locator('[data-discrepancy-id="br-1"]')).toContainText("Sneha Iyer");
  await expect(page.getByRole("button", { name: "Approve & write off" })).toHaveCount(0);
  await page.getByRole("button", { name: "Lock (switch role)", exact: true }).click();
  await signIn(page, "staff", "Ms. Rupali Patil", false);
  await openPage(page, "Breakage & waste");
  await page.locator('[data-discrepancy-id="br-1"]').getByRole("button", { name: "Approve & write off" }).dblclick();
  await expect.poll(async () => (await localStore(page)).discrepancies[0].status).toBe("written-off");
  expect((await localStore(page)).containers.find((container: { chemical_id: string }) => container.chemical_id === "it-17").qty).toBe(42);
  await page.reload();
  await expect(page.locator('[data-discrepancy-id="br-1"]')).toContainText("written-off");
  expect((await localStore(page)).containers.find((container: { chemical_id: string }) => container.chemical_id === "it-17").qty).toBe(42);
  await assertFitsViewport(page);
});

test("populated item details, vendor prices and the original manual barcode fit the screen", async ({ page }) => {
  await signIn(page, "staff", "Ms. Rupali Patil");
  await openPage(page, "Inventory");
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page.getByRole("button", { name: /^E\. coli ATCC 25922/ }).getByTitle("GHS08 — Health hazard / BSL", { exact: true }).hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    const bounds = await page.getByRole("tooltip").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await assertFitsViewport(page);
  }
  await page.getByRole("button", { name: /^Ethanol 95%/ }).click();
  let panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { name: "Ethanol 95%", exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Prices", exact: true }).click();
  await expect(panel.getByText("HiMedia Laboratories", { exact: true })).toBeVisible();
  await expect(panel.getByText("Nashik Scientific Traders", { exact: true })).toBeVisible();
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await assertFitsViewport(page);
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Scan barcode", exact: true }).click();
  panel = page.getByRole("dialog");
  await panel.getByLabel("manual barcode entry").fill("8906001000001");
  await panel.getByRole("button", { name: "Go", exact: true }).click();
  await expect(panel.getByText("Ethanol 95%", { exact: true })).toBeVisible();
  await expect(panel).toContainText("18 L in stock");
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await assertFitsViewport(page);
});


test("verification registers expose a responsive controlled-indent flow", async ({ page }) => {
  await signIn(page, "student", "Aarav Sharma");
  await openPage(page, "Registers");
  await expect(page.getByText("Workflow summary", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Indents", exact: true }).click();
  await page.getByRole("button", { name: "New indent" }).click();
  const dialog = page.getByRole("dialog", { name: "Create digital indent" });
  await dialog.getByLabel("Item").selectOption({ label: "Nutrient agar (HiMedia) · g" });
  await dialog.getByLabel("Quantity").fill("6");
  await dialog.getByLabel("Purpose").fill("T.Y. B.Sc. controlled practical issue");
  await dialog.getByRole("button", { name: "Submit indent" }).click();
  await expect(page.getByText("Digital indent submitted for decision.", { exact: true })).toBeVisible();
  await expect(page.getByText("T.Y. B.Sc. controlled practical issue", { exact: true })).toBeVisible();
  await assertFitsViewport(page);
});

test("automation preview uses the available laboratory records", async ({page}) => {
 await signIn(page,"principal");await openPage(page,"Automations");
 await expect(page.getByText("Report preview",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Preview report",exact:true}).click();
 const report=page.getByTestId("automation-report-content");await expect(report).toBeVisible();
 await expect(report).toContainText("38");await expect(report).toContainText("MacConkey");
 await expect(page.getByRole("button",{name:"Send my approved test"})).toHaveCount(0);
 await assertFitsViewport(page);
});

test("students cannot open the automation centre", async ({page}) => {
 await signIn(page,"student");await page.goto("/automation");
 await expect(page.locator("main h1")).toContainText("Student dashboard");
 await assertFitsViewport(page);
});
