# Repository security checks

Run `python3 scripts/security_scan.py` before installing dependencies, starting
the application, or loading Vite configuration. To inspect incoming changes
without checking them out or executing them:

```sh
git -c core.hooksPath=/dev/null fetch origin
python3 scripts/security_scan.py --ref origin/main
```

The check detects the loader found in commit `9299a51`, large encoded JavaScript
payloads, `node init` hooks, remote shell launchers, tracked environment files,
unexpected executable binaries, and unresolved merge markers. It also checks
that dependency lockfiles resolve to the npm registry. These are targeted
checks, not a guarantee that arbitrary code or dependencies are malware-free.

The same scan runs in GitHub Actions without installing application dependencies.
Require the check and reviewed pull requests in branch protection to prevent a
future direct push from bypassing review.

## Incident cleaned up on 2026-11-27

The remote tip contained identical obfuscated loaders in `backend/init` and
`frontend/init`, plus an embedded copy in `frontend/vite.config.js`. npm scripts
launched the loaders before backend startup and frontend build/development.
The two standalone loaders had SHA-256:

```text
baecd750d0a11f1eea428a5a07dc53ef1b8227affb5deb86d43d254b031a2ebe
```

The cleanup removes these files/payloads, restores clean scripts and environment
ignore rules, and preserves unrelated remote feature work and local SMS OTP
changes. The suspicious code was read as data and was not executed during this
cleanup. Git history is retained; do not check out and run the infected commit.

Repository cleanup does not establish that a previously affected machine or
GitHub account is clean. If that remote build/start configuration was run,
rebuild the affected host from trusted sources and rotate credentials available
to that process (including deployment/GitHub, database, SMS, payment, and cloud
keys). Review repository write access and sessions to address reinfection.
