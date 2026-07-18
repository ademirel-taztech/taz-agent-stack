---
name: observability-instrumentation
description: When the user wants to add or review logging, metrics, or tracing instrumentation for a feature or service. Also use when taa-dev needs to instrument a new endpoint/handler, or taa-ops is writing a runbook and needs to know what signals exist to check. Trigger phrases - "add logging," "instrument this," "what metrics should we track," "add tracing," "observability," "how do we know if this broke in production." For the deploy/runbook artifact itself, see the taa-ops agent - this skill covers what to instrument, not how to deploy.
metadata:
  version: 1.0.0
---

# Observability Instrumentation

Mechanical guidance on what to log/measure/trace for a feature — the
judgment is choosing signals that would actually help diagnose a real
failure, not instrumenting everything indiscriminately (noise defeats
observability as much as silence does).

## Process

1. **Identify the failure modes worth watching** (from `.taa/architecture.md`'s
   Threat Model and any known error paths) — instrument for *those*, not
   generically. "What would I need to know to diagnose this at 3am" is the
   right question.
2. **Structured logging**, not string concatenation: every log line carries
   a correlation/trace ID, the actor (user/tenant/service), and the outcome.
   Follow the repo's existing logging convention (Serilog/structured JSON,
   Winston, etc.) — don't introduce a second logging library.
   - Log at the boundary of each trust boundary from the threat model
     (request received, auth decision, external call made, external call
     result).
   - Never log secrets, full credit card numbers, or raw PII — this is the
     same rule `taa-guard` enforces mechanically; instrumentation code is
     not exempt.
3. **Metrics** (counters/gauges/histograms): request rate, error rate,
   latency histogram (feeds the same P95 metric `taa-qa`/load-testing prove),
   and any business metric this feature specifically needs (e.g. "invoices
   generated" is more useful than only "HTTP 200s returned"). Use the
   project's existing metrics backend (Prometheus, Application Insights,
   Datadog, etc.).
4. **Tracing:** propagate a correlation ID across service boundaries; span
   each external call (DB, third-party API, queue publish) so a slow request
   can be attributed to a specific hop rather than "the whole request was
   slow."
5. **Alerting hook (name it, don't wire the alert yourself unless asked):**
   state which metric/log pattern *should* trigger an alert and at what
   threshold — this feeds `taa-ops`'s runbook directly.

## Rules
- Instrument for diagnosability of real failure modes, not exhaustively —
  a feature with 40 log lines nobody will ever grep is worse than one with
  5 well-chosen ones.
- Never log secrets/PII — same rule as everywhere else in this pipeline.
- Match the repo's existing observability stack; don't introduce a second
  logging/metrics/tracing library "just for this feature."

## Output
Instrumentation plan/diff: log points (with what context each carries),
metrics added, trace spans added, and the alert-worthy signals named for
`taa-ops`'s runbook.
