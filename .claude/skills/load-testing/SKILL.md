---
name: load-testing
description: When the user wants to design or run a load test, verify a latency/throughput metric with real evidence, or fill in a TAA metrics.md performance target. Also use when taa-qa needs to prove a P95-latency-style metric at Stage 9 (QA-B) using templates/taa/loadtest.template.js. Trigger phrases - "load test," "k6 script," "verify P95 latency," "how many requests can this handle," "stress test," "performance metric proof." For accessibility (Lighthouse) or coverage metrics, see the taa-qa agent directly - this skill only covers throughput/latency load testing.
metadata:
  version: 1.0.0
---

# Load Testing

Mechanical harness for proving a latency/throughput metric with real
command output — never asserting a P95 number without having actually run
something that measured it.

## When this runs
- `taa-qa` Phase B (Stage 9, QA-B), proving a `metrics.md` latency/throughput
  target using `templates/taa/loadtest.template.js` (k6).
- Standalone, when a user wants a load test designed or the results
  interpreted.

## Process

1. **Check for `k6`.** `command -v k6`. If missing: "I can't run a load test —
   k6 isn't installed (`brew install k6` or see k6.io/docs/getting-started).
   I can still design the script for you to run." Never fabricate what a
   load test "would probably show."
2. **Copy the template.** `templates/taa/loadtest.template.js` →
   `.taa/tests/loadtest.js`. Fill in:
   - `BASE_URL` — **local or staging only, never production** (same rule as
     Playwright MCP usage elsewhere in TAA).
   - The scenario: which endpoint(s), what request shape, realistic payload
     (Must-Use-Real-Data rule — no `foo`/`bar` bodies).
   - `vus` (virtual users) and `duration` matched to what the metric's target
     actually claims to represent (e.g. "handles our current peak traffic" —
     find the real peak number, don't guess).
   - The `thresholds` block mirrors the metric's target exactly (e.g.
     `p(95)<200` for a "P95 < 200ms" metric) so the k6 run itself fails
     honestly if the target isn't met.
3. **Run it:** `k6 run .taa/tests/loadtest.js`. Never edit a failing
   threshold to make the run pass — a failing threshold is the answer.
4. **Interpret the summary.** Report the actual `http_req_duration` p(95)
   (and p(99) if relevant), error rate, and requests/sec — paste the real
   numbers into `metrics.md`'s Result column, not a paraphrase.
5. **If the target fails:** report it as a failed metric (per QA-B's normal
   process) with the actual numbers — this feeds DEV's fix list, not a
   silently lowered target.

## Rules
- No P95/throughput number in any report without the k6 (or equivalent
  tool's) actual output backing it.
- Never target production — staging/local only.
- If the load pattern in the script doesn't match real usage (e.g. testing
  a burst pattern when the metric describes sustained load), say so — a
  technically-passing load test against the wrong pattern is a false proof.

## Output
The filled script path, the exact command run, the real summary numbers
(p95/p99/error-rate/rps), and pass/fail against the metric's target.
