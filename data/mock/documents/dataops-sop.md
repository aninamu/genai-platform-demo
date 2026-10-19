# Synthetic sample document — Reference Data Reconciliation SOP

> Watermark: Synthetic sample document. Not a Nasdaq document.

> Note: Every threshold, timing, owner, and severity cutoff in this document is an example value for demonstration only. None of it is real policy.

## Break classes

- **Type-A mapping drift:** block publication until remapped
- **Type-B vendor lag:** may publish with quality flag
- **Type-C corporate action pending:** freeze symbols until CA ID applied

## Quality gates

- Unresolved breaks must be under 0.5%
- Zero Type-A mismatches before daily sign-off

## Reconciliation checks

> Note: All tolerances, timings, and owners in this section are example values, not real policy. Vendors and identifiers are synthetic.

### Sources compared

- **Vendor Alpha (synthetic)** reference feed vs. **internal golden record**
- **Vendor Beta (synthetic)** pricing feed vs. **Vendor Alpha (synthetic)** pricing feed
- **Corporate action bulletin** vs. **internal golden record** (shares outstanding, ratios, effective dates)

### Tolerance thresholds

- **Price:** Example value: difference above 0.25% of the golden-record price
- **Shares outstanding:** Example value: difference above 0.10%
- **Static fields (name, currency, listing venue):** Example value: zero tolerance, any difference
- **Effective dates:** Example value: zero tolerance, any difference

### When a difference counts as a break

- The difference exceeds the tolerance for that field
- The difference persists across two consecutive runs (Example value: runs 30 minutes apart)
- A field is populated in one source and missing in the other
- Any static-field difference is a break on first occurrence

### Investigation steps

1. Confirm both source snapshots and their load timestamps
2. Check for a pending corporate action (Type-C) before anything else
3. Check vendor lag (Type-B) against the vendor's published delivery window
4. Check identifier mapping (see Symbology mismatches)
5. Record evidence for every step in the break ticket; do not close on assumption

### Sign-off

- **Preparer:** Example owner: Data Ops analyst on shift
- **Approver:** Example owner: Data Ops lead (must be a different person from the preparer)
- **Deadline:** Example value: daily sign-off by 17:00 local time

## Symbology mismatches

> Note: All identifiers below are synthetic and clearly fake (the `ZZ` prefix and `SYN` tickers are not assigned to any real security). Source precedence, timings, and owners are example values, not real policy.

### Identifier conflicts

| Conflict | Vendor Alpha (synthetic) | Vendor Beta (synthetic) | Golden record |
| --- | --- | --- | --- |
| Ticker | `SYNA` | `SYNA.X` | `SYNA` |
| ISIN-style ID | `ZZ0000000017` | `ZZ0000000025` | `ZZ0000000017` |
| CUSIP-style ID | `ZZZ00017X` | `ZZZ00017X` | `ZZZ00017X` |

### Which source wins

- **Example rule:** golden record wins for ISIN-style and CUSIP-style IDs
- **Example rule:** Vendor Alpha (synthetic) wins for ticker changes once a corporate action ID is applied
- **Example rule:** if no source can be confirmed, no source wins; hold the symbol (Type-A)

### How to remap

1. Freeze publication for the affected symbol (Type-A mapping drift)
2. Confirm the correct identifier against the winning source and attach evidence
3. Update the mapping table entry with old value, new value, and reason
4. Re-run reconciliation for the symbol and confirm zero mismatches
5. Get approver sign-off before releasing the freeze

### When to escalate

- The winning source itself is inconsistent
- One identifier maps to more than one security (Example value: any occurrence)
- The remap is not resolved within Example value: 2 hours
- More than Example value: 10 symbols are affected in a single run

## Severity and escalation

> Note: Severity levels, cutoffs, timings, and owners in this section are example values, not real policy.

### Severity levels

- **Sev-1:** Example cutoff: incorrect data already published, or more than 50 symbols affected
- **Sev-2:** Example cutoff: Type-A break blocking publication, or 10–50 symbols affected
- **Sev-3:** Example cutoff: Type-B or Type-C break within tolerance window, fewer than 10 symbols
- **Sev-4:** Example cutoff: cosmetic or static-field difference with no downstream impact

### Escalation path and timing

- **Sev-1:** Example timing: page Data Ops lead within 15 minutes; Example owner: Data Ops lead notifies the data quality manager within 30 minutes
- **Sev-2:** Example timing: notify Data Ops lead within 1 hour
- **Sev-3:** Example timing: log in break queue; review at next scheduled reconciliation
- **Sev-4:** Example timing: batch into weekly review

### Evidence rule

- **Never guess a root cause.** A root cause is recorded only when it is supported by attached evidence (source snapshots, mapping history, corporate action ID).
- **Never declare a break material without evidence and sign-off.** Materiality requires attached evidence and approval from the Example owner: Data Ops lead.
- If evidence is incomplete, mark the root cause as "under investigation" and keep the severity at its current level.
