# Dependency-audit tool reference

| Ecosystem | Detect via | Vulnerability scan | Notes |
|---|---|---|---|
| .NET | `*.csproj`, `*.sln` | `dotnet list package --vulnerable --include-transitive` | Requires a NuGet restore first (`dotnet restore`) or the command reports nothing found |
| npm/Node | `package.json` | `npm audit --omit=dev` (add `--json` for parseable output) | `--omit=dev` avoids flooding findings with dev-tool-only vulns; still mention count of dev-only findings separately |
| Python | `requirements.txt`, `pyproject.toml` | `pip-audit` (not installed by default — check `command -v pip-audit`) | `pip-audit -r requirements.txt` for a plain requirements file |
| Any (secrets) | — | `gitleaks detect --source . --no-git` (or `--source .` inside a git repo for full history) | Check `command -v gitleaks` first |
| Any (SAST) | — | `semgrep --config auto .` | Slower; fine for CI, less useful for a quick per-PR check unless scoped |

## License lookup shortcuts
- .NET: `dotnet-project-licenses` (community tool, not built-in) or manually
  check each package's NuGet page.
- npm: `npx license-checker --summary` gives a fast license-per-package
  breakdown without installing anything permanently (`npx` fetches on demand).
- Python: `pip-licenses` (`pip install pip-licenses` then `pip-licenses`).

## Copyleft licenses to flag (non-exhaustive, flag anything unfamiliar too)
GPL-2.0, GPL-3.0, AGPL-3.0, LGPL (flag for review — LGPL is often fine if
only dynamically linked, but confirm the linking model rather than assuming),
SSPL, BUSL (source-available, not truly open — has its own commercial-use
restrictions, flag for legal review not auto-approval).

## Common false-alarm patterns worth knowing
- A vulnerability in a `devDependencies`-only package (e.g. a test runner)
  is real but lower priority than one in a runtime dependency — report both,
  rank differently.
- A "vulnerable" transitive dependency that's never actually reachable from
  this project's code path (e.g. a vulnerable JSON parser feature this
  project never calls) is still worth reporting, but note the reachability
  context so the human can triage severity accurately — don't silently
  downgrade it yourself without saying so.
