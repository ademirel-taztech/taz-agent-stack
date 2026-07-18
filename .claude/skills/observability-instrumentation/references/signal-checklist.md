# Observability signal checklist

## The four golden signals (per request/handler)
1. **Latency** — how long did it take (split success vs. error latency —
   errors are often artificially fast, e.g. an early validation failure,
   which can make average latency look better than it is).
2. **Traffic** — requests/events per second.
3. **Errors** — rate of failed requests, broken down by failure type (4xx
   vs 5xx, timeout vs. validation vs. downstream failure).
4. **Saturation** — how full is the resource (queue depth, connection pool
   usage, CPU/memory) — the leading indicator before latency/errors degrade.

## What to log at each trust boundary (from the threat model)
- **Request received:** correlation ID, actor (user/tenant/service — never
  the full credential), endpoint, timestamp.
- **Auth decision:** allow/deny, which policy matched, actor.
- **External call made:** target, correlation ID propagated, timestamp.
- **External call result:** success/failure, latency, error detail (sanitized
  — no leaking the downstream system's internal error text if it could
  contain sensitive info).
- **State transition:** old state → new state, actor, timestamp (this is
  also your repudiation countermeasure from the threat model).

## Example: structured log line (language-agnostic shape)
```json
{
  "timestamp": "2026-07-18T14:23:01Z",
  "level": "info",
  "correlation_id": "a1b2c3d4",
  "tenant_id": "t_789",
  "actor": "user_456",
  "event": "invoice.status_changed",
  "from_state": "draft",
  "to_state": "sent",
  "latency_ms": 42
}
```

## Alert-worthy thresholds (starting points, tune to actual traffic)
- Error rate > 1% sustained over 5 minutes → page.
- P95 latency > 2x the metrics.md target sustained over 5 minutes → page.
- Queue/connection-pool saturation > 80% → warn; > 95% → page.
- A Critical finding class from `findings/CHECKLIST.md` recurring in
  production logs (e.g. an IDOR attempt pattern) → page security, not just
  log it.
