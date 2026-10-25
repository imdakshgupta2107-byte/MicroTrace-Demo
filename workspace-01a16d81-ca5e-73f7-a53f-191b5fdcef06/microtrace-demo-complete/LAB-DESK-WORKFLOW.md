# Lab Desk — Report vs. Request workflow

MicroTrace Demo 6.4 adds a role-routed **Lab Desk** within the existing **Requests** page. It keeps two operational intents deliberately separate:

1. **Report an issue** — an observation that needs a physical check.
2. **Request material or culture** — an academic requirement that needs endorsement and/or fulfilment.

This distinction prevents an observation from becoming an unreviewed stock deduction and keeps a requirement from being confused with consumption.

## Report an issue

Examples include evaporation/volume loss, contamination or degradation, a missing or misplaced item, maintenance, and quality concerns.

- The originator records the observed condition, location, optional related item, and priority.
- The entry becomes a routed **Lab Desk review flag**.
- Lab staff acknowledge and start a physical review; the principal sees unresolved reports in the governance view.
- Closing the report requires a recorded outcome.
- **No report changes inventory automatically.** A verified loss still needs the existing Breakage & waste record or the controlled Registers workflow.

## Request material or culture

The requirement slip supports current-stock material, culture/strain, prepared consumable/top-up, procurement/research, and other academic requirements.

| Originator | Route | Guardrail |
|---|---|---|
| Student issue report | Lab staff physical audit; principal digest when unresolved | No write-off on submission |
| Student requirement | Teacher endorsement → lab staff fulfilment | Lab staff cannot start fulfilment before endorsement |
| Teacher issue report | Lab staff audit with principal oversight | No automatic stock adjustment |
| Teacher requirement | Lab staff fulfilment; principal oversight for procurement | The service result is not an inventory issue |

A fulfilled Lab Desk requirement only records that the operational request was handled. Material issue, custody acknowledgement, stock deduction, purchase order, or GRN must be recorded through their existing dedicated controls.

## Dashboard and export visibility

- Students see their own Lab Desk entries.
- Teachers see their own entries plus student requirements needing academic endorsement.
- Lab staff see routed reports and requirements in the operational queue.
- Principals see an aggregated **Maintenance & discrepancies** view and **Faculty academic requirements**.
- Reports page exports the local Lab Desk governance register as `.xlsx`.

## Presentation statement

> MicroTrace separates observed loss or quality concerns from routine academic demand. It creates a traceable review route, requires the right people to endorse or fulfil work, and keeps stock movement as a separately controlled event.

## Offline limitation

Lab Desk records are stored locally in this demonstration build. They show a workflow and audit trail, but do not prove physical observation, identity, independent review, calibrated measurement, or real-time notification. They are not a secure live ticketing system.
