# Synthetic sample document — Client Support Escalation Playbook

> Watermark: Synthetic sample document. Not a Nasdaq document.

All clients, tickets, and incidents in this playbook are synthetic examples.

## Section 1 — Triage and severity

Assign severity at first touch. If two levels seem to fit, pick the higher one and downgrade once facts are confirmed.

| Severity | Criteria | Synthetic example |
| --- | --- | --- |
| P1 / Sev-1 | Production market data is down or delayed for a client, there is no workaround, or several clients in a region are affected. | Client A reports no ticks on any symbol in us-east-1 since 09:31 ET. Two other clients open tickets for the same region. |
| P2 / Sev-2 | Production service is degraded for one client, or a workaround exists, or a subset of data is missing. | Client B receives Level 1 quotes but not Level 2 depth for one venue. Other venues are normal. |
| P3 / Sev-3 | No current production impact. Covers questions, non-urgent configuration, documentation, or issues in test environments. | Client C asks why a UAT session shows a stale symbol list. Production is unaffected. |

Rules:

1. Severity follows client impact, not how loudly the issue is reported.
2. Re-triage as soon as impact changes, and record the reason in the ticket.
3. Any issue that matches the P1 criteria follows Section 2, whatever severity it was opened at.

## Section 2 — P1 connectivity / data delay

1. Open a Sev-1 ticket immediately.
2. Notify the incident bridge within 5 minutes.
3. Do not ask the client to restart until primary status is confirmed.
4. Acknowledge within 15 minutes; restore or fail over within 60 minutes.
5. Provide a written summary within 4 hours.

## Section 3 — P2 and P3 paths

> Example values (synthetic); adjust owners and timings to your team.

### P2 / Sev-2

1. Open a Sev-2 ticket. Owner: support duty lead.
2. Acknowledge within 15 minutes.
3. Engage the on-call engineer through the ticket queue. A bridge is optional.
4. Send client updates at least every 60 minutes, or sooner if facts change.
5. Provide a written summary within 4 hours of resolution.
6. Escalate to P1 (Section 2) if impact spreads to more clients or regions, if the workaround fails, or if there is no confirmed workaround after 60 minutes.

### P3 / Sev-3

1. Open a Sev-3 ticket. Owner: assigned support analyst.
2. Acknowledge within 4 business hours.
3. Send client updates at least once per business day, or sooner if facts change.
4. Route product or documentation questions to the owning team through the ticket queue. Do not page anyone.
5. Escalate to P2 if production impact appears, or if the client is blocked from a scheduled go-live.

## Section 4 — Client communication rules

### Confirmed facts only

1. Support never guesses root causes in client communication.
2. State only facts confirmed by engineering or the incident bridge: what is affected, since when, and what is being done.
3. Until engineering confirms a cause, say: "The cause is under investigation."
4. Do not repeat internal hypotheses, even as possibilities ("it may be a network issue").

### ETA wording

1. Use the committed timings: acknowledgement within 15 minutes, and a written summary within 4 hours.
2. Never promise a fix time such as "fixed in 30 minutes." Commit to the time of the next update instead.
3. Always give the next update as a clock time with timezone, and send it on time even if nothing has changed.

Next-update template:

> We are actively working on this issue. The cause is under investigation. Our next update will be at [HH:MM timezone], or sooner if we have confirmed new information.

## Section 5 — Entitlement mismatch runbook

Symptom: a client cannot see data they are entitled to.

Checks:

1. Confirm the client account, user ID, product, and region from the ticket.
2. Compare the entitlement record with the products and venues on the client's order form.
3. Check whether the user's session started before the most recent entitlement change. If it did, a new login may be needed.
4. Confirm whether one user or all users on the account are affected.
5. Confirm whether other clients with the same product are affected. If they are, re-triage under Section 1.

Who to involve:

- Entitlements administration: when the record is missing or differs from the order form.
- Account manager: when the order form itself is unclear or disputed.
- On-call engineer: when the record is correct but data is still not delivered.

Client reply template:

> Thank you for reporting this. We have confirmed your account [account ID] and the affected product [product] in [region]. We are reviewing your entitlement configuration. The cause is under investigation. Our next update will be at [HH:MM timezone], or sooner if we have confirmed new information.

Synthetic example: Client D's user D-02 cannot see Level 2 depth after an upgrade. The entitlement record still lists Level 1 only. Entitlements administration corrects it, the user logs in again, and depth data appears.

## Section 6 — Reconnect loop runbook

Symptom: a client feed repeatedly disconnects and reconnects.

Diagnostics:

1. Record the session ID, region, and gateway, and the time the loop started.
2. Pull the reconnect count and disconnect reason codes from the session logs (heartbeat timeout, login reject, or session replaced).
3. Check for duplicate sessions using the same credentials. A second login can replace the first and cause a loop.
4. Confirm gateway health in the ops console for that region.
5. Confirm whether other clients on the same gateway are affected.

Escalation:

- One client with a confirmed client-side cause, such as a duplicate login: handle as P2 and share confirmed steps with the client.
- One client and no client-side cause after diagnostics: P2. Engage the on-call engineer.
- Several clients on the same gateway, or the client has no usable data: P1. Follow Section 2.

Reconnect SLA wording:

> Our market data reconnect SLA is acknowledgement within 15 minutes and a written summary within 4 hours. For Sev-1 incidents, we target restore or failover within 60 minutes. The cause is under investigation. Our next update will be at [HH:MM timezone].

Quote the 60-minute Sev-1 target as an SLA target only. Do not turn it into a fix promise for a specific incident.

Synthetic example: Client E's session reconnects 40 times in 10 minutes with reason "session replaced." Logs show a second login from a test host using production credentials. After the client stops the test host, the loop ends.

## Reply guidance

Thank the client, confirm entitlement and region, share the next update time (see Section 4), and offer a bridge invite. Do not speculate on root cause early.
