# METRICS — {feature name}

| ID | Metric | Target | How measured | Result (QA-B) |
|---|---|---|---|---|
| M-1 | API latency P95 | < 200 ms | k6 / integration timing | |
| M-2 | Unit coverage (Application layer) | > 80 % | coverlet / vitest --coverage | |
| M-3 | Critical/High SEC findings | 0 | .taa/review.md | |
| M-4 | Accessibility (UI) | Lighthouse ≥ 90 | lighthouse-ci | |
