---
name: api-design-review
description: When the user wants an API contract (REST endpoint, request/response DTOs, error model) reviewed for consistency, RESTful conventions, versioning, or breaking-change risk. Also use when taa-architect is locking architecture.md's API contract section, or taa-security is checking auth/authz policy completeness per endpoint. Trigger phrases - "review this API design," "is this endpoint RESTful," "API contract review," "breaking change in this API," "error response format." For the actual data model / migration, see db-migration-review; for auth/authz vulnerability checking, see the taa-security agent.
metadata:
  version: 1.0.0
---

# API Design Review

Mechanical consistency checks for an API contract — the conventions
themselves are usually settled by the existing codebase (brownfield rule);
this skill's job is enforcing that consistency and catching the specific
mistakes that create breaking changes or authz gaps.

## Process

1. **Match existing conventions first (brownfield rule).** Before applying
   generic REST best practices, check what this repo already does: resource
   naming (plural nouns? `/orders` vs `/order`), pagination style
   (`page`/`pageSize` vs `cursor`), error response shape, versioning scheme
   (URL path `/v2/`, header, or none yet). A new endpoint that follows a
   different convention than every existing one is a finding, even if the
   new convention is arguably "more correct" in the abstract.
2. **Resource/verb consistency:** nouns for resources, HTTP methods for
   actions (`POST /orders/{id}/cancel` not `POST /cancelOrder`), consistent
   pluralization, nested resources reflect real ownership
   (`/tenants/{id}/users` not a flat `/users?tenantId=`) unless the existing
   codebase already does otherwise.
3. **Request/response contract completeness:** every field's type,
   required/optional, and validation constraint stated; every documented
   error code has a concrete trigger condition (not "may return 400 in some
   cases").
4. **Auth policy stated per endpoint** — explicit, not "inherits from
   somewhere." Cross-reference with the threat model's trust boundaries: a
   new endpoint that crosses a trust boundary needs its auth policy to
   actually be reviewable against the threat there.
5. **Breaking-change check** (for changes to an existing endpoint): would
   this break an existing client? Removing/renaming a field, changing a
   field's type, changing default behavior, tightening validation on an
   existing field are all breaking. Adding an optional field is not. Flag
   any breaking change and require an explicit versioning decision
   (new version, or an accepted breaking change with client coordination) —
   never let one slip through as if it were additive.
6. **Pagination/filtering consistency** on list endpoints — matches the
   existing pattern, doesn't invent a new one per endpoint.

## Rules
- Brownfield consistency beats abstract best practice — don't recommend a
  "better" REST convention that would create a second pattern alongside an
  established one.
- Every finding names the specific field/endpoint/line, not a general
  observation.
- Breaking changes are a blocking finding by default, not a suggestion —
  they need an explicit decision (version bump or accepted with
  coordination), not a silent pass.

## Output
Convention-consistency findings, contract-completeness gaps, breaking-change
flags (each with the specific field/behavior and why it breaks existing
clients), and auth-policy-per-endpoint confirmation.
