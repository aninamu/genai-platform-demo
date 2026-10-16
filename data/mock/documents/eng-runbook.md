# Synthetic sample document — Market Data Gateway Runbook

> Watermark: Synthetic sample document. Not a Nasdaq document.

## Failover procedure

1. Confirm primary health in the ops console.
2. Drain publishers on `md-gw-primary`.
3. Promote `md-gw-standby` with `gwctl promote --region us-east-1`.
4. Validate tick continuity for at least 60 seconds.
5. Record the cutover timestamp in the incident note.

## On-call escalation

- Page primary engineer (15 minutes).
- Page secondary if unanswered.
- Escalate Sev-1 to the engineering manager with gateway health screenshots.
