# Common migration lock patterns (Postgres-focused, note EF Core/MySQL deltas)

| Operation | Lock behavior | Safe alternative |
|---|---|---|
| `ADD COLUMN ... NOT NULL` (no default), any table size | Table rewrite, `ACCESS EXCLUSIVE` lock for the duration | Add nullable, backfill in batches, then add `NOT NULL` (Postgres 12+ can validate a `CHECK` constraint `NOT VALID` then `VALIDATE CONSTRAINT` without a long lock) |
| `ADD COLUMN ... NOT NULL DEFAULT <const>` | Postgres 11+: metadata-only, fast. Postgres <11 / most other RDBMS: full rewrite | Confirm engine + version before assuming fast path |
| `CREATE INDEX` (plain) | `SHARE` lock — blocks writes for the build duration | `CREATE INDEX CONCURRENTLY` (Postgres) — no write lock, but can't run inside a transaction block and needs a retry-on-failure plan |
| `ALTER COLUMN TYPE` (binary-incompatible, e.g. int→text) | Full table rewrite | Add new column, dual-write, backfill, cut over, drop old column — four small migrations instead of one big one |
| `DROP COLUMN` | Fast (Postgres marks it dead, doesn't reclaim until vacuum) but **irreversible** — the data is gone once applied | Confirm with the human before applying; consider renaming instead of dropping for one release cycle |
| Adding a foreign key on an existing large table | Validates existing rows by default — can be long | `ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT` separately (doesn't block writes during validation) |

## EF Core specifics
- `Add-Migration` generates both `Up` and `Down` — review `Down` isn't just
  the `Up` in reverse doing something destructive (e.g. `Down` dropping a
  column that had production data by the time rollback is needed).
- `context.Database.Migrate()` at app startup applies migrations on every
  instance boot — for multi-instance deployments this can race; prefer a
  dedicated migration step in the deploy pipeline (this is `taa-ops`'s
  concern too — coordinate).

## Batch-backfill pattern (safe at scale)
```sql
-- instead of one UPDATE touching millions of rows in one transaction:
DO $$
DECLARE batch_size INT := 5000;
BEGIN
  LOOP
    UPDATE my_table SET new_col = compute(old_col)
    WHERE id IN (SELECT id FROM my_table WHERE new_col IS NULL LIMIT batch_size);
    EXIT WHEN NOT FOUND;
    COMMIT; -- release locks between batches
  END LOOP;
END $$;
```
