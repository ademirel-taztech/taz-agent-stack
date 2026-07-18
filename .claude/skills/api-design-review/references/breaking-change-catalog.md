# Breaking vs. non-breaking API changes

## Breaking (require a version bump or explicit client coordination)
- Removing a response field a client might read.
- Renaming any field (request or response).
- Changing a field's type (string → number, nullable → non-nullable and
  vice versa in a way that changes client-side handling).
- Changing an enum's existing values (adding a new enum value is usually
  non-breaking if clients are expected to handle unknown values gracefully —
  **but only if that expectation is actually documented/established**;
  otherwise treat as breaking too).
- Tightening validation on an existing request field (a previously-accepted
  value now gets rejected).
- Changing default behavior when a field is omitted.
- Changing HTTP status codes returned for an existing condition.
- Changing pagination defaults (default page size, cursor format).
- Removing or renaming an endpoint/route.

## Non-breaking (generally safe to ship without a version bump)
- Adding a new optional request field.
- Adding a new response field (as long as clients aren't validating against
  a strict schema that rejects unknown fields — confirm this assumption for
  this codebase rather than assuming universally).
- Adding a new endpoint.
- Adding a new enum value **if and only if** "handle unknown values
  gracefully" is an established, documented client contract.
- Loosening validation (accepting something previously rejected).
- Performance improvements with no behavior change.

## Error response shape consistency
A consistent error shape across every endpoint matters more than which
shape is chosen. Common patterns (pick whichever the repo already uses):
```json
// RFC 7807 Problem Details style
{ "type": "...", "title": "...", "status": 400, "detail": "...", "instance": "..." }

// Simple code/message style
{ "error": { "code": "VALIDATION_FAILED", "message": "...", "fields": {...} } }
```
Flag any endpoint whose error shape doesn't match the rest of the API as a
consistency finding, even if the shape itself is reasonable in isolation.

## Auth policy statement quality
Weak: "requires authentication."
Useful: "requires a valid JWT with `tenant:write` scope; the `tenantId` in
the request body must match the token's `tenantId` claim (server-enforced,
not client-supplied trust)."
