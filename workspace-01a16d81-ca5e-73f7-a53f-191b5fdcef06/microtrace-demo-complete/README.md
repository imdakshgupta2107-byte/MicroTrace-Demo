# MicroTrace Demo 6.4.1

**MicroTrace Demo** is a populated, offline-first laboratory-material demonstration app. It retains the supplied navy/gold branding and original sample lab while adding practical workflow controls in **Registers**:

- digital issue and purchase indents with a decision trail and partial quantities;
- goods-receipt / GRN recording with invoice, batch, expected/delivered/accepted/rejected quantities and an independent-verifier simulation;
- one-time local handover references and receiver acknowledgement before an issue movement;
- practical/session closure: issued = used + returned + waste + remaining + unexplained difference;
- blind physical stock counts, independent recount, evidence and investigation;
- an explicitly authorised reconciliation adjustment, never a silent balance rewrite; and
- a local control-audit sequence alongside the original audit log; and
- a role-routed **Lab Desk** that keeps operational issue reports separate from material/culture requirement slips. Reports create review flags, while requirements route through teacher endorsement and/or lab-staff fulfilment without silently deducting stock.

## What is included

The original populated fixtures remain present: 38 inventory items/containers, 5 requests, 4 vendors, 51 vendor prices, 3 purchase orders, 2 practicals, 2 bookings, 1 breakage, 8 original audit entries and 7 illustrative people. Four illustrative Lab Desk entries and the Registers fixtures are clearly marked as workflow examples; they do not claim to be historic lab events.

**Demo access:** Student no PIN; Teacher `2222`; Lab staff `1111`; Principal `0000`.

## Important boundary

This is a **demo workspace**, not a live laboratory system. The default build stores records on one device. The optional `VITE_DEMO_SHARED_REQUESTS=true` mode shares request rows between PIN-mode devices, but it deliberately does **not** provide secure identity, MFA, server enforcement, tamper-proof storage, calibrated measurement, physical access locks, hardware integration, or prevention of collusion. PINs are not a substitute for named accounts; real controls require approved SOPs, trained people, controlled access and a secure backend.

Read [LAB-DESK-WORKFLOW.md](LAB-DESK-WORKFLOW.md) for the Report vs. Request role matrix, [VERIFICATION-AND-LIMITS.md](VERIFICATION-AND-LIMITS.md) for the control map and test boundary, and [BUILD-APK.md](BUILD-APK.md) for Android Studio Rabbit 1 / 2026.2.1 instructions.

## Quick start for developers

```bash
npm ci
npm run build
npx cap sync android
npx cap open android
```

The default build runs the presentation workspace. Set `VITE_APP_MODE=live` with the public Supabase URL and publishable key (or use `npm run build:live`) to produce the shared live build; never place a service-role key or mail credential in `VITE_*`.

## Windows desktop — online shared-demo shell

Run all commands from this project folder — the folder containing `package.json` — **not** from `C:\Windows\System32`.

```powershell
npm ci
npm run desktop           # opens the canonical online MicroTrace demo
npm run desktop:windows   # creates the Windows installer
```

The desktop app loads **https://microtrace-demo.vercel.app** rather than keeping a separate local request store. Therefore a request raised in the desktop app is sent through the same temporary shared-demo backend as the phone site, and staff decisions synchronize across both. Internet access is required for that shared workflow. The installer is written to `release\windows\MicroTrace-Demo-6.4.1-Setup.exe`.

See [docs/DESKTOP-ONLINE-SYNC.md](docs/DESKTOP-ONLINE-SYNC.md) for the connection model, security boundary, and scope.

### Quality commands

```bash
npm run typecheck
npm run typecheck:tests
npm test
npm run build
npm run test:e2e
npm run android:debug       # requires JDK 17 + Android SDK Platform 34
npm run package:source
```

`BUILD-WINDOWS.ps1 -OpenAndroid` is a root-safe Windows helper. It changes to its own folder first, so it avoids the common `package.json`-folder mistake.
