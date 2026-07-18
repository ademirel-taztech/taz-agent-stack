# ARCHITECTURE — {feature name}

## 1. Context & constraints
<!-- brownfield findings with file references, or greenfield stack lockdown -->
## 2. Layering & dependency rules (Mermaid)
## 3. Data model
| Entity | Fields | Relations | Indexes |
|---|---|---|---|

## 4. API contract
| Method | Route | Request DTO | Response DTO | Auth policy | Errors |
|---|---|---|---|---|---|

## 5. Cross-cutting decisions
<!-- caching, multi-tenancy, transactions, idempotency, pagination -->
## 6. Threat Model (STRIDE mini-analysis — mandatory)
**Assets:** <!-- what's worth protecting: data, credentials, availability -->
**Trust boundaries:** <!-- where untrusted input enters: API edge, auth boundary, third-party webhook, MCP/external content -->

| # | Threat (STRIDE category) | Asset/boundary affected | Countermeasure |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

<!-- Minimum 5 threats. SEC's Phase denetimi checks its findings against this
section — a Critical/High SEC finding that maps to a threat missing here is
itself a finding against this template's completeness, not just the code. -->

## 7. ADRs
### ADR-001: {title}
Context / Options / Decision / Consequences

## 8. DEV constraint checklist (review contract)
- [ ] …
