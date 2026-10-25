#!/usr/bin/env node
// Hosted downloads are deliberately not bundled into the Android WebView.
// Vercel uses `npm run build` and keeps them; Capacitor uses this pruning step.
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve('dist');
for (const entry of ['downloads', 'download.html', 'VERIFICATION-AND-LIMITS.md']) {
  const target = path.join(dist, entry);
  fs.rmSync(target, { recursive: true, force: true });
}
console.log('Pruned hosted download artifacts from native web assets.');
