# k6 scenario patterns

## Sustained load (verify a steady-state P95)
```js
export const options = {
  scenarios: {
    steady: { executor: "constant-vus", vus: 20, duration: "2m" },
  },
  thresholds: { "http_req_duration{expected_response:true}": ["p(95)<200"] },
};
```

## Ramp-up (find where latency starts degrading)
```js
export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "3m", target: 50 },
        { duration: "1m", target: 0 },
      ],
    },
  },
};
```

## Spike (burst traffic, e.g. a flash-sale or campaign-launch scenario)
```js
export const options = {
  scenarios: {
    spike: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      stages: [
        { duration: "10s", target: 10 },
        { duration: "30s", target: 300 }, // the spike
        { duration: "30s", target: 10 },
      ],
    },
  },
};
```

## Reading the summary output
```
http_req_duration..............: avg=45.2ms min=12ms med=38ms max=890ms p(90)=78ms p(95)=112ms
http_req_failed.................: 0.42% ✓ 21 ✗ 4979
http_reqs.......................: 5000  83.2/s
```
- `http_req_duration{expected_response:true}` p(95) is what a "P95 < Xms"
  metric target refers to — filter to `expected_response:true` so failed
  requests (which are often artificially fast — a quick 500) don't skew the
  latency number optimistically.
- `http_req_failed` > 0 alongside a passing latency threshold is still a
  problem worth reporting even if it's not the metric under test.

## Choosing realistic VU/duration numbers
Don't default to "20 VUs for a minute" out of habit — match the scenario to
what the metric's target claims to represent:
- "Handles current peak traffic" → check real analytics/APM for actual peak
  requests/sec, convert to an approximate VU count for the endpoint's typical
  response time (`VUs ≈ target_rps × avg_response_time_seconds`).
- "Survives a launch-day spike" → use the ramping-arrival-rate pattern above,
  not constant-vus.
