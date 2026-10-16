# Synthetic sample document — API Style Guide

> Watermark: Synthetic sample document. Not a Nasdaq document.

## Conventions

- Plural kebab-case paths under `/v1/`
- camelCase JSON fields
- RFC 9457 problem details for errors
- Cursor pagination with `cursor` and `limit`
- `Idempotency-Key` required on mutating creates

## Example

`GET /v1/payment-instruments?limit=25`
