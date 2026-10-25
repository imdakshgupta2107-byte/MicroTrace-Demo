# MicroTrace Desktop — online shared-demo connection

The Windows Electron package is an online desktop shell for the canonical MicroTrace demo:

`https://microtrace-demo.vercel.app`

It does **not** bundle a separate local request database. When the desktop app starts, it opens that exact hosted workspace with Electron's Node integration disabled and sandboxing enabled.

## What this guarantees

1. A request submitted from the desktop app is written through the same temporary Supabase `demo_shared_requests` transport as the Vercel site on a phone.
2. A phone signed in to the Student, Staff, or Principal demo view receives request changes through Supabase Realtime; refresh is also supported as a fallback.
3. Staff decisions made on either the desktop app or phone site update the same request record and appear on the other device.
4. The desktop app always loads the current published web interface, so an updated Vercel deployment is picked up without rebuilding the Electron shell.

## Connection behaviour

- Internet is required for shared requests and staff decisions.
- If the hosted workspace cannot be reached, the desktop app shows a retry page rather than silently opening a disconnected local request store.
- External links open in the user's normal browser. The Electron renderer runs with `contextIsolation`, `sandbox`, and `nodeIntegration: false`.

## Scope and security boundary

The agreed temporary PIN demo shares **requests only** across devices. It intentionally uses the isolated `public.demo_shared_requests` table; it does not expose or weaken the secure live inventory, accounts, schedules, audits, or other protected Supabase tables.

Other demo tools remain available in the desktop and phone interfaces. Local-only demo records are not represented as shared authoritative lab data. Moving every inventory, booking, project, or audit record to cross-device use requires the separate authenticated live workspace, not the temporary anonymous PIN transport.

## Build the Windows package

```powershell
npm ci
npm run desktop:windows
```

The installer is written to `release/windows/`. No Supabase secret, service-role key, or desktop-specific environment file is required for this online shell.
