---
name: db-migration-review
description: When the user wants a database migration reviewed for reversibility, lock duration, index impact, or data-loss risk. Also use when taa-data is running its mandatory migration review between ARCH and DEV, or DEV/OPS need to check a migration before applying it. Trigger phrases - "review this migration," "is this migration safe," "will this lock the table," "can I roll this back," "migration risk." For seed/demo data generation and analytics event schemas, see the taa-data agent's other responsibilities (not covered by this skill).
metadata:
  version: 1.0.0
---

# DB Migration Review

Mechanical risk assessment for schema migrations — reversibility, lock
duration, index impact, data-loss risk. Estimate at realistic scale, not
"should be fine on my laptop."

## Process

1. **Read the actual migration** (up and down/rollback scripts, or the
   EF Core/Prisma/Rails-style migration file) — never review a description
   of a migration you haven't read.
2. **Reversibility.** Does a working `down` exist? If yes, what state does
   rolling back leave the data in — is any data generated between apply and
   rollback lost? If no reversal is possible (e.g. a `DROP COLUMN`), say so
   explicitly as a one-way door.
3. **Lock duration.** At the table's *real* row count (ask, or check
   `.taa/architecture.md`'s data model for expected scale — don't assume
   "small"):
   - `ADD COLUMN ... NOT NULL` without a default on Postgres <11 or on a
     large table: full table rewrite, long lock.
   - `ADD COLUMN ... NOT NULL DEFAULT <const>` on Postgres 11+: metadata-only,
     fast — but confirm the actual DB engine/version, don't assume.
   - New index: `CREATE INDEX CONCURRENTLY` (Postgres) avoids the write lock;
     a plain `CREATE INDEX` does not — flag if concurrent creation wasn't used
     on a table that gets concurrent writes.
   - Any `ALTER COLUMN TYPE` that isn't binary-compatible: full rewrite.
4. **Index impact.** New indexes: do they actually serve a query in this
   feature's access patterns (check `architecture.md`'s API contract), or is
   it a guess? Removed/changed indexes: what query plans depended on them?
5. **Data-loss risk.** Any `DROP`, type-narrowing (e.g. `varchar(255)` →
   `varchar(50)`), or truncation. If there's a backfill step: does it run in
   batches (safe) or one transaction (risky at scale, long-held locks)?
6. **Severity-rank findings** the same way `taa-security` does (Critical/
   High/Medium/Low), so a migration review reads consistently with a SEC
   review at the same gate.

## Rules
- Never approve a migration by assuming "probably fine" — state the actual
  row-count assumption your assessment rests on, so it can be checked.
- A Critical/High finding here (e.g. an unrecoverable data-loss path, or a
  lock that would take down a high-traffic table) blocks the same way an
  unresolved SEC finding does.
- Flag missing rollback scripts as a finding, don't silently write one
  yourself without the human confirming the rollback's semantics are correct.

## Output
Per-migration: reversibility verdict, lock-duration estimate (with the
row-count assumption stated), index-impact notes, data-loss risk, and a
severity-ranked finding list for anything concerning.
