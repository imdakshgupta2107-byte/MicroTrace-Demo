# Original demo data restoration

## Source and provenance

The sample lab was recovered from the earlier MicroTrace application's `data.js` (`microtraceSeed`). Its contents are retained in `src/demo/legacy-demo.json` with reference date **2026-10-15**. This date is a template anchor, not a fixed current date. Login-password hashes were deliberately omitted: this build continues to use the repaired version-6 role/PIN workflow, not the older email/password mechanism.

The archive contains the complete reference dataset and the complete adapter in `src/demo/seed.ts`. No network fetch is needed to initialize it. It is bundled into the compiled JavaScript and synchronized Android assets.

## Record mapping

| Earlier data | MicroTrace 6 Demo |
|---|---|
| 38 `items` | 38 catalog `chemicals` plus one opening-balance `container` each |
| Categories Chemicals / Instruments / Consumables / Cultures | Typed categories Chemical / Instrument / Consumable / Culture |
| `qty`, `unit`, `min`, `loc`, `exp`, `sup` | Container quantity/unit size/location/expiry; catalog unit/minimum/supplier |
| Existing barcode | Preserved on the associated opening-stock container |
| GHS codes, PPE, storage group | Preserved; old `none` storage group maps to `general` |
| Returnable flag | Retained in item notes and in the unchanged legacy reference JSON |
| 5 requests | Same IDs, original people, item IDs, quantities, purposes, statuses, decisions and dates |
| 4 vendors / 51 quotes | Same vendors, contact text, labels and quote amounts; deterministic quote IDs added |
| 3 POs | Same quantities, vendor/item references, totals, statuses and historical dates |
| 2 practicals | Same titles, class names and item requirements |
| 2 bookings | Visible Instrument bookings page, preserving instrument/date/slot/person/purpose/status/note |
| 1 breakage | Visible Breakage & waste page, with Sneha Iyer's original three-tube report |
| 8 logs | Audit history with original names/actions and deterministic numeric IDs |
| 7 sample users | Read-only example roster in Settings and stored `demo_users`; four original people prefill the role picker |

The original seed expressed glove/mask quotes as “100 pcs box” / “50 pcs box” while stock was measured in **boxes**. The adapter keeps those quote labels and amounts, but maps a quoted box to **one** box stock unit. The legacy JSON preserves the original packSize values for reference. This prevents comparing a ₹420 box as if it contained 100 inventory *boxes*.

Historical received orders and issued requests are history, not instructions to apply stock movements at startup. The original opening quantities stay exactly as provided (for example, Petri dishes 120 and Nutrient agar 480 g). The 38 barcodes and locations are preserved.

There are no invented incidents or lab notes. Quantities, prices, contacts, biosafety text and practical requirements remain demo examples, not validated real-lab guidance or current quotes. Category charts count inventory records instead of adding incompatible physical units such as litres, grams and pieces.

## First-launch lifecycle

1. `main.tsx` calls `initializeDemo()` **before React mounts**.
2. If the dedicated demo store does not exist, `buildDemoStore(now)` creates all collections in one atomic `localStorage.setItem`.
3. The template dates shift to the device's local calendar date. Date-only fields stay date-only; audit/issue history has timestamps.
4. Existing demo snapshots are never silently merged or replaced, even if intentionally emptied. Corrupt JSON is not destroyed; the user can reach Settings to explicitly restore it.
5. Reloads, StrictMode, external-store reads, role changes and hot refresh do not keep injecting seed rows.
6. The seed never unlocks a role or saves a profile. Name validation and staged privileged PIN verification remain in place.

This keeps cached auth/profile snapshots stable and avoids reintroducing React #185.

## Reset and exports

Lab staff or Principal can choose **Settings → Demo data → Restore original demo data**. A confirmation dialog and acknowledgement checkbox are required. Restore replaces the demo lab dataset (including instrument bookings), refreshes relative dates and notifies the normal React Query subscriptions. Profile/auth keys and the non-demo app's storage are not cleared. Independent workbench bench-reservation preferences are not part of the old lab seed.

“Export demo snapshot” saves a readable JSON copy of the current demo store. This is an export for inspection/developer recovery; a JSON-import UI is not included. Use the explicit restore button to return to the supplied sample lab.

## Isolation

- Demo app: `com.microtrace.lab.demo`, **MicroTrace Demo**, version 6.1.0 / code 7.
- Previous non-demo app: `com.microtrace.lab` (not replaced).
- Demo store: `microtrace_6_demo_store`.
- Demo session/profile: `microtrace_6_demo_auth`, `microtrace_6_demo_profile`.
- Device/workbench keys also have a demo-specific namespace.
- Existing `microtrace_v3_*` keys from the non-demo app are not read, migrated, cleared or overwritten.
- Supabase client creation is blocked by the demo-build guard. Environment values alone cannot upload the sample lab.

## Branding provenance

`public/brand/logo-original.png` is a byte-for-byte copy of the supplied “WhatsApp Image 2026-09-24 at 8.12.01 PM.png”.

SHA-256: `b527402ea7b0713a5dd71509737a0f9f2753325f5e02952e33ba09689446a565`

The icon/wordmark crops and Android resources are generated by `scripts/create-brand-assets.py` using Pillow. Only cropping, contain-resizing and padding are used; no generative redraw or stretching. The original upload remains in the delivered ZIP.
