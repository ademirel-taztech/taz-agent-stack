// k6 load test skeleton for a TAA metrics.md P95-latency metric.
// Copy to .taa/tests/loadtest.js, fill in BASE_URL and the scenario(s) below,
// then run: k6 run .taa/tests/loadtest.js
// QA-B pastes the real `http_req_duration{expected_response:true}` p(95)
// from k6's summary output into metrics.md's Result column — never a guess.

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000"; // staging/local only, never production

export const options = {
  scenarios: {
    steady_load: {
      executor: "constant-vus",
      vus: 20, // adjust to the traffic level the metric's target assumes
      duration: "1m",
    },
  },
  thresholds: {
    // Mirrors the metrics.md target — a failing threshold fails the k6 run,
    // which is the honest signal QA-B reports, not a passed test with a
    // quietly-worse P95.
    "http_req_duration{expected_response:true}": ["p(95)<200"],
  },
};

export default function () {
  // Replace with the actual endpoint(s) this metric covers.
  const res = http.get(`${BASE_URL}/api/replace-with-real-endpoint`);
  check(res, {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
  });
  sleep(1);
}
