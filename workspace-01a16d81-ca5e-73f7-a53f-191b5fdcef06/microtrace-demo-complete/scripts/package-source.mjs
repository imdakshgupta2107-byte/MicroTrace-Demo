#!/usr/bin/env node
/** Create the clean, Android-Studio-openable MicroTrace Demo source handoff. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const output = path.resolve(root, '..', `MicroTrace Demo ${packageVersion} Online Desktop Source.zip`);
const skip = new Set(['node_modules', '.git', '.gradle', '.idea', '.vscode', 'build', 'dist', 'coverage', 'playwright-report', 'test-results', '.cache', '.secrets', '.temp', '__pycache__', '.tools', 'artifact-transfer', 'docs']);
const entries = {};
function visit(dir, relative = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relative ? `${relative}/${item.name}` : item.name;
    const file = path.join(dir, item.name);
    if (item.isSymbolicLink()) continue;
    if (item.isDirectory()) { if (!skip.has(item.name)) visit(file, rel); continue; }
    if (!item.isFile() || (item.name.startsWith('.env') && item.name !== '.env.example') ||
      /\.(jks|keystore|log|zip|apk|pem|pyc)$/.test(item.name) ||
      ['local.properties', 'keystore.properties', 'WORKPLAN.md'].includes(item.name) ||
      /^client_secret.*\.json$/.test(item.name) || ['credentials.json', 'token.json'].includes(item.name)) continue;
    entries[rel] = new Uint8Array(fs.readFileSync(file));
  }
}
visit(root);
for (const required of [
  'package.json', 'package-lock.json', 'README.md', 'BUILD-APK.md', 'BUILD-WINDOWS.ps1', 'VERIFICATION-AND-LIMITS.md', 'LAB-DESK-WORKFLOW.md',
  'src/pages/registers-page.tsx', 'src/registers/ledger.ts', 'src/registers/store.ts',
  'src/components/service-desk/service-desk-panel.tsx', 'src/service-desk/ledger.ts', 'src/service-desk/store.ts',
  'android/gradlew.bat', 'android/gradle/wrapper/gradle-wrapper.jar',
  'android/app/src/main/java/com/microtrace/lab/automation/MainActivity.java',
  'android/app/src/main/assets/public/index.html', 'public/brand/logo-original.png',
]) if (!entries[required]) throw new Error(`Missing ${required}`);
fs.writeFileSync(output, zipSync(entries, { level: 6 }));
console.log(`Saved ${output}: ${Object.keys(entries).length} files, ${fs.statSync(output).size} bytes. package.json is at the ZIP root; no dependencies, private environment files, keys or APKs are included.`);
