---
name: threat-modeling
description: When the user wants to threat-model a feature, system, or architecture change using STRIDE, or needs the mandatory Threat Model section of a TAA architecture.md filled in. Also use when taa-architect needs to run its Stage 4 STRIDE mini-analysis, or taa-security needs to cross-check findings against a threat model. Trigger phrases - "threat model," "STRIDE analysis," "what could go wrong security-wise," "trust boundaries," "attack surface," "security design review." For the actual code-level vulnerability audit after implementation, see the taa-security agent, not this skill.
metadata:
  version: 1.0.0
---

# Threat Modeling (STRIDE)

Mechanical scaffolding for a STRIDE mini-analysis — the reasoning about which
threats actually apply is the model's job, this skill just makes sure nothing
structural gets skipped.

## When this runs
- `taa-architect`, Stage 4 of `/taa:start`, filling in `architecture.md`'s
  mandatory `## 6. Threat Model` section (see `templates/taa/architecture.template.md`).
- Standalone, when a user asks to threat-model something outside a full
  pipeline run.

## Process

1. **Name the assets.** What's actually worth protecting: user data (by
   sensitivity class), credentials/tokens, availability of a critical path,
   money/billing state, audit/compliance records. Vague assets ("the system")
   aren't useful — name the specific thing an attacker would want.
2. **Draw the trust boundaries.** Every place untrusted input crosses into a
   more-trusted zone: the public API edge, the auth boundary (authenticated
   vs. not), a third-party webhook receiver, any MCP/external-content
   ingestion point, a file upload handler, an admin-only surface. List each
   boundary explicitly — most missed threats live at an undrawn boundary.
3. **STRIDE per boundary.** For each trust boundary, walk the six categories
   and ask "does this apply here, concretely":
   - **S**poofing — can an actor pretend to be someone/something they're not?
   - **T**ampering — can data be modified in transit or at rest without detection?
   - **R**epudiation — can an actor deny having done something, with no audit trail?
   - **I**nformation disclosure — can data leak to someone who shouldn't see it?
   - **E**levation of privilege — can a lower-privileged actor gain higher privilege?
   - **D**enial of service — can availability be degraded/exhausted?
   Not every category applies to every boundary — say "not applicable, because
   X" rather than forcing a threat that isn't real.
4. **Countermeasure per threat.** Concrete, not aspirational ("validate input"
   is not a countermeasure; "reject any `tenantId` in the request body that
   doesn't match the authenticated session's tenant" is).
5. **Minimum 5 threats** in the final table — if STRIDE-per-boundary produces
   fewer than 5 genuine threats, the trust-boundary list from step 2 is
   probably incomplete; go back and look for a missed boundary rather than
   padding with weak threats.

## Rules
- A threat model is not a vulnerability scan — it's structural reasoning
  before code exists. It doesn't replace `taa-security`'s post-implementation
  audit; it gives that audit something concrete to check against.
- No countermeasure without a specific mechanism — "add monitoring" needs to
  say monitoring *of what, alerting on what condition*.
- If asked to threat-model something with no clear trust boundaries yet
  (very early ideation), say so and recommend finishing the API/data-model
  sketch first — a threat model needs *something* concrete to model against.

## Output
The filled `## 6. Threat Model` table (assets, trust boundaries, ≥5
threats+countermeasures), plus a one-line note on any boundary you
deliberately excluded and why.
