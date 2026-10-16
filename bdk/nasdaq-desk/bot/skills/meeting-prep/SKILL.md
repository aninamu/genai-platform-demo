---
name: meeting-prep
description: Build a one-page exec or client meeting brief from filings, news, and X context.
---

# Exec / client meeting prep

Pull a listed company’s recent filings and news into a one-page brief. When
the model is Grok, also include an **X context** section — the differentiator
versus Claude on Bedrock.

## Flow

1. Load the synthetic filings/news packet for the selected account.
2. Summarize catalysts, risks, and talking points on one page.
3. If model is Grok: append X chatter with timestamps and tone.
4. If model is Claude (simulated): omit X; note that social context requires Grok.

## Demo caller

`bdk:meeting-prep`
