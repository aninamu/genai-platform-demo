# Synthetic sample document — Corporate action bulletin NW-CA-482

> Watermark: Synthetic sample document. Not a Nasdaq document.

## Bulletin

| Field | Value |
| --- | --- |
| Bulletin id | NW-CA-482 |
| Effective | 2026-10-16 T06:00Z |
| Issuer | Northwind Holdings (synthetic) |
| Action | 2-for-1 stock split + ticker continuity |
| Affected | AAPL.O synthetic map row, 7203 JT lag line, XYZ CA pending |

## Observed breaks (morning batch)

1. **AAPL.O vs AAPL UW** — MIC → composite remap missing after split factor.
2. **7203 JT** — vendor Asia open lag > SLA; quality flag candidate.
3. **XYZ** — CA ID not applied; freeze until bulletin CA ID stamped.

## Client impact

Buy-side desks entitlement on Feed X may see duplicate or stalled symbols until
Type-A remap completes.
