# METRICS — {feature name}

Each metric names the **tool** and the **exact command** that measures it —
QA-B proves the target with that command's real output, or writes
"could not be measured — `<tool>` not installed" (never silently skipped,
never asserted without the command's output attached).

| ID | Metric | Target | Tool | Command | Result (QA-B) |
|---|---|---|---|---|---|
| M-1 | API latency P95 | < 200 ms | k6 | `k6 run templates/taa/loadtest.template.js` (copy to `.taa/tests/loadtest.js` and fill in the target URL/scenario first) | |
| M-2 | Unit coverage (Application layer) | > 80 % | coverlet / vitest --coverage | `dotnet test /p:CollectCoverage=true` or `npm test -- --coverage` | |
| M-3 | Critical/High SEC findings | 0 | taa-security | see `.taa/review.md` | |
| M-4 | Accessibility (UI) | Lighthouse ≥ 90 | lighthouse-ci | `lhci autorun --collect.url=<page>` | |
