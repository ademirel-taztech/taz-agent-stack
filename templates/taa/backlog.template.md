# BACKLOG — {feature name}

## EPIC TAA-001: {epic title}
### Feature TAA-010: {feature title}
- [ ] **TAA-011** {task title} — S/M/L
  - Refs: SPEC §…, ARCH §…
  - Depends on: —
  - DoD: {definition of done}
  - Status: TODO
  - Prompt: {one imperative, self-contained instruction DEV/QA/OPS can execute
    without re-reading the whole run — names the exact files/layers to touch,
    the contract to honor (ARCH §…/DES §…), and repeats the DoD above. Written
    so this line alone could be handed to a subagent as its task.}
  - Status notes: —

<!--
Status values: TODO | IN_PROGRESS | BLOCKED: {reason} | DONE
- DEV may only set DONE when the DoD is actually met and tests pass — a
  partial or deferred task is BLOCKED with a reason, never silently DONE.
- The checkbox mirrors Status for a quick visual scan: `[ ]` = anything not
  DONE, `[x]` = DONE. Keep them in sync when either changes.
- The orchestrator refuses to start DREAM while any item is TODO/IN_PROGRESS/
  BLOCKED — see start.md § Completion. A BLOCKED item must be resolved,
  descoped with the user's explicit sign-off (note it here), or the item is
  removed from scope before DREAM runs.
-->
