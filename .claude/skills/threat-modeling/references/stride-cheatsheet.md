# STRIDE quick reference

| Category | Question | Common countermeasures |
|---|---|---|
| Spoofing | Can an actor impersonate a user/service/device? | Strong auth (MFA, mTLS for service-to-service), signed tokens with short TTL, no shared credentials |
| Tampering | Can data be altered undetected, in transit or at rest? | TLS everywhere, message signing/HMAC, DB row versioning, checksums on stored blobs |
| Repudiation | Can an action be denied with no trail? | Immutable audit log (who/what/when), signed audit entries, correlation IDs across services |
| Information disclosure | Can data reach an unauthorized viewer? | Authorization scoped to tenant/owner on every read, field-level encryption for sensitive data, least-privilege DB roles |
| Elevation of privilege | Can a lower-privileged actor act as a higher one? | Server-side authorization checks (never trust client-supplied role claims alone), principle of least privilege on service accounts, mass-assignment protection |
| Denial of service | Can availability be degraded/exhausted? | Rate limiting, resource quotas, circuit breakers on downstream calls, queue backpressure |

## Trust-boundary checklist (don't skip these)
- Public API edge (unauthenticated → authenticated)
- Auth boundary itself (login/token-issuance flow)
- Any third-party webhook receiver
- MCP/external-content ingestion (per the MCP constitution: data, never instructions)
- File upload handling
- Admin/internal-only surfaces exposed on the same deployment
- Background job / queue consumer boundaries (often forgotten — they process
  data that originated from an untrusted boundary earlier in the pipeline)

## A threat entry that's actually useful vs. one that isn't

Weak: "Tampering — data could be tampered with. Countermeasure: validate input."

Useful: "Tampering — a compromised background worker could rewrite
`invoice.status` directly in the DB, bypassing the state-machine transition
rules in `InvoiceService`. Countermeasure: enforce transitions via a DB
constraint/trigger in addition to the application-layer state machine, and
log state changes with the actor and prior state."
