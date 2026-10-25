#!/usr/bin/env node
// Optional reproducible screenshots after `npm run build` + `npm run preview -- --port 5201`.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs', 'screenshots');
const url = process.env.DEMO_PREVIEW_URL || 'http://127.0.0.1:5201';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
});

async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage, scale: 'css', animations: 'disabled' });
  console.log(name);
}
async function login(page, role, pin) {
  await page.getByRole('button', { name: new RegExp('^' + role) }).click();
  if (pin) {
    await page.getByLabel(role + ' PIN').fill(pin);
    await page.getByRole('button', { name: 'Verify PIN', exact: true }).click();
  }
  const mode = { Student: 'student', 'Lab staff': 'staff', Principal: 'principal' }[role];
  await page.getByRole('button', { name: 'Enter MicroTrace as ' + mode, exact: true }).click();
  await page.locator('main h1').filter({ hasText: 'dashboard' }).waitFor();
  await page.getByRole('heading', { name: /your lab|Your bench|Keep the lab/ }).first().waitFor();
}
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Kolkata' });
  const page = await desktop.newPage();
  await page.goto(url + '/onboarding');
  await page.getByRole('heading', { name: 'MicroTrace', exact: true }).waitFor();
  await shot(page, 'desktop-welcome');
  await login(page, 'Principal', '0000');
  await page.getByRole('img', { name: 'Donut chart, total 5', exact: true }).waitFor();
  await shot(page, 'desktop-principal-dashboard');
  await page.getByTestId('desktop-sidebar').getByRole('link', { name: 'Inventory', exact: true }).click();
  await page.getByRole('button', { name: /^Ethanol 95%/ }).waitFor();
  await shot(page, 'desktop-inventory');
  await desktop.close();

  const phone = await browser.newContext({ ...devices['Pixel 5'], timezoneId: 'Asia/Kolkata' });
  const mobile = await phone.newPage();
  await mobile.goto(url + '/onboarding');
  await mobile.getByRole('heading', { name: 'MicroTrace', exact: true }).waitFor();
  await shot(mobile, 'phone-welcome', true);
  await login(mobile, 'Student');
  await mobile.getByText('Petri dishes 90 mm (borosil)', { exact: true }).first().waitFor();
  await shot(mobile, 'phone-student-dashboard');
  await mobile.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('link', { name: 'Inventory', exact: true }).click();
  await mobile.getByRole('button', { name: /^Ethanol 95%/ }).waitFor();
  await shot(mobile, 'phone-inventory');
  await mobile.getByRole('button', { name: /^Ethanol 95%/ }).click();
  await mobile.getByRole('dialog').getByRole('button', { name: 'Prices', exact: true }).click();
  await mobile.getByText('Nashik Scientific Traders', { exact: true }).waitFor();
  await shot(mobile, 'phone-vendor-prices');
  await phone.close();
} finally { await browser.close(); }
