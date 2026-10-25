# Demo boundaries, data and security

This is a **local-only demonstration app**, not a production multi-user laboratory system.

## What the build does

- Bundles the earlier sample dataset and supplied logo. Data is initialized once on first launch; no backend or first-launch demo-data download is required.
- Uses dedicated `microtrace_6_demo_*` keys and Android package `com.microtrace.lab.demo`. It does not replace the previous non-demo app or its `microtrace_v3_*` records.
- Disables standard Android app backup for the demo installation.
- Keeps edits across reloads and role changes. Explicit restore replaces only the demo lab records after confirmation.
- Exports files only when the user chooses an export/share action. Android exports use the app cache and platform chooser.
- Disables creation of a Supabase client in this demo build, including when environment values are present. Sample records cannot be seeded into a real cloud lab accidentally.
- Disables optional live PubChem lookup by default. Explicitly enabling it sends the entered chemical name to the public PubChem service; manual entry and the bundled demo remain usable without it.

The website needs a first online visit before PWA offline caching is available. Android uses bundled assets, hash routes and no web service worker. Each app installation/browser has an independent copy of the sample lab; devices do not share changes.

## Role locks are not authentication

Student uses no PIN; staff/teacher/principal default to 1111/2222/0000. The welcome screen deliberately reveals demo PINs. Build-time `VITE_*` values are readable in client code and are never secrets. Do not enter credentials, confidential student data or genuine lab stock in this sample app.

Original sample people are an illustrative roster. Old email/password hashes are not included and no email/password sign-in, account approval or server-enforced identity is claimed. A pending label on a sample roster entry is historical demo content, not an authentication state.

For production, implement real identities, server-side role checks, least-privilege RLS, transactional stock updates, secure audit policies, appropriate backup/retention and cross-device consistency. The SQL file retains development/demo policies and is **not** safe for confidential production data. Merely removing the demo guard or adding an anon key is not a production migration.

## Data accuracy and device limits

- Vendor names, contact strings and prices come from the earlier sample dataset; they have not been verified as current procurement information.
- Hazard labels, PPE text, expiry examples and practical requirements are sample content. They are not validated protocols, supplier SDS, sterilization validation or instrument safety authorization. Confirm all real procedures with trained staff and current authoritative documentation.
- Date-only screens use the device calendar day. Restore refreshes relative sample dates; ordinary reloads do not.
- Local storage can be erased by browser data clearing, uninstall, device reset or storage policies. Export a JSON snapshot if you want a readable copy of demo edits. No JSON-import UI is included.
- Instrument slot checks are for this local demo, not distributed reservations on a shared server.
- Timers operate while the workbench page/app is active. No guaranteed Android background alarm/service is implemented.
- Camera permission/scanning, native share targets and APK installation must be checked on actual target devices. Browser emulation is not a physical-device test.

## Distribution

No private environment file, Supabase secret/service key, local Android SDK path, keystore or signing password is packaged. Sign release APKs with a private, backed-up key. Increment Android version code for future updates to this demo package. A signed APK is not the same thing as this source ZIP.

The project retains the Capacitor 6 ecosystem and documented dependency-audit caveats. Review the lockfile/audit before public production deployment; do not force incompatible package overrides simply to silence warnings.
