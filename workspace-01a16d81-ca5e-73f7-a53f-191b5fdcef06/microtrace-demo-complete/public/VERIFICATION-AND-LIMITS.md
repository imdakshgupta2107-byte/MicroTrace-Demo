# MicroTrace Demo — verification controls and honest limits

## Demonstrated workflow controls

| Control | What the offline demo actually does |
|---|---|
| Digital indent register | Separates **issue** and **purchase** intents; records requester, purpose, quantity, status, approver/decision note and partial fulfilment. A matching display name cannot approve its own pending indent. |
| Verified receipt / GRN | Captures PO/expected amount (when linked), invoice/challan, supplier, batch, expiry, delivered, accepted and rejected quantities. Accepted stock is added as a labelled verified container only after a different local profile verifies the receipt. |
| Handover/custody | Creates a single-use local reference first. Stock remains unchanged while it is prepared; it moves once when the named receiver acknowledges. Issued is not treated as consumed. |
| Practical/session closure | Requires non-negative quantities and prevents accounting above the issued amount. It records used, safe-returned, waste, remaining custody and unexplained balance. A reviewed approved return is restored once; used/waste are not deducted again. |
| Blind stock count | Stores the expected balance but hides it from the counter view until the observed quantity is submitted. A discrepancy needs an independent local recount by a different display name. |
| Reconciliation | A non-matching recount opens an investigation with evidence and a visible status. It does **not** change inventory automatically. A principal simulation may record a reasoned, visible adjustment; the original count, difference and audit entry remain. |
| Movement and audit | Every Registers action appends a local control-audit record with a previous-record link and mirrors a movement-style entry in the existing audit log. The app has no register-delete action. |
| Lab Desk — Report vs Request | Separates observed issues from material/culture requirements. A report makes a routed review flag and never changes stock. A student requirement needs teacher endorsement before lab-staff fulfilment; teacher requirements route to lab staff with principal oversight for procurement. Closure records an outcome, but any stock issue, verified loss or procurement movement remains separately controlled. |
| Guidance | Registers explains the workflow and exposes the limitations in the UI; Settings retains the explicit local/demo status and reset control. |

## Deliberate limitations

This offline demo runs in browser/app local storage. The role PINs and profile names are public presentation conveniences. A person with the device, browser developer tools, exported storage or a modified app can alter local data. The audit link sequence is therefore **not tamper-proof or forensic evidence**.

The app cannot establish who physically handled a container, whether two people are genuinely independent, whether a scale or volume reading is calibrated, whether a return is safe, or whether anyone colluded. It has no MFA, controlled cabinet/door integration, barcode scanner guarantee, cloud consensus, live recipient email, hardware locks or server-side policy enforcement.

For a real deployment, replace this demo with authenticated individual accounts, a secured RLS-backed service, retained server audit logs, supervised procedures, trained independent verifiers, calibrated instruments, appropriate physical access controls and institutional records policy.

## Verification performed for this release

- TypeScript source and test-project type checks.
- 70 unit tests, including ledger tests covering issue acknowledgement/no double deduction, independent GRN verification, no automatic reconciliation adjustment, and Lab Desk report/request routing without silent stock deduction.
- 92 browser end-to-end checks across desktop, Android-size, tablet and small-phone viewports, including the full Lab Desk Report → physical review and student requirement → teacher endorsement → lab-staff fulfilment path.
- Production Vite build.
- Capacitor Android asset sync.
- Android Gradle debug APK build with JDK 17, Android SDK Platform 34 / Build Tools 34.0.0 and Gradle 8.2.1.
- APK manifest/package/label/version inspection, ZIP integrity check and APK signature verification.

No physical Android device, real laboratory, actual identity provider, calibrated instrument, live email sender or hardware access-control integration was tested or claimed.
