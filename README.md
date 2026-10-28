# AI Pulse

AI Pulse is an enterprise AI maturity diagnostic platform that assesses how teams use generative AI at work. Employees complete role-adaptive assessments, receive individual risk summaries and growth recommendations, and leadership monitors aggregated department maturity while preserving employee anonymity.

This repository was inherited from a previous developer and has been systematically hardened, verified, and extended for production enterprise deployment.

---

## 1. What I Found Wrong (Audit Summary)

A rigorous audit identified critical vulnerabilities and operational defects across security, multi-tenancy, data integrity, and AI resilience:

| Finding ID | Severity | Area | Summary |
|---|---|---|---|
| **SEC-01** | **Critical** | Multi-Tenancy / IDOR | `/dashboard?org_id=...` only checked if the caller was an admin, but never verified that the admin belonged to the requested `org_id`. Any admin could view another organization's departments, scores, and risks. |
| **SEC-02** | **Critical** | Multi-Tenancy / Auth | `/auth/select-org` minted org-scoped JWTs for any arbitrary `org_id` without checking if the user held a membership in that company. |
| **SEC-03** | **Critical** | Secrets Management | Production secret `SECRET_KEY=pulse-7f3a9c2e1b-prod` was committed and tracked in `.env` without `.env.example`. |
| **SEC-04** | **High** | Cryptography | Passwords stored with single-round unsalted SHA-256, vulnerable to rainbow tables. |
| **LOGIC-01** | **High** | Role Adaptation | String comparison `seniority < min_seniority` caused `"lead"` roles to be excluded from mid- and senior-level questions because `"lead" < "mid"` evaluates to `True` in Python. |
| **DATA-01** | **High** | Mathematical Integrity | Department average score was computed as `sum(scores) / len(dept_members)`, dividing total question points across all respondents by headcount, corrupting scores onto a 20+ scale instead of 1–5. Also, maturity thresholds differed between `utils.py` and `dashboard.py`. |
| **AI-01** | **High** | AI Resilience | Model output was parsed via raw `json.loads(raw)` with zero exception handling, schema validation, score clamping (canned mock output had score: 7 and string scores like `"four"`), or flag whitelisting. Markdown code fences triggered 500 errors. |
| **AI-02** | **High** | Prompt Safety | Raw user answers were interpolated directly into the prompt without length limits or system/user boundary encapsulation. |
| **DATA-02** | **High** | Idempotency | Re-taking diagnostics appended duplicate rows to `responses`, skewing all reports and dashboard counts. |
| **TEST-01** | **Medium** | Quality Assurance | `test_admin_cannot_see_other_org` tested querying the admin's *own* organization (`org_id=1`), giving false confidence. |

Full details are documented in [docs/AUDIT.md](docs/AUDIT.md). For complete side-by-side Before vs. After code snippets and technical diff breakdowns of every problem, see [docs/PROBLEMS_AND_FIXES.md](docs/PROBLEMS_AND_FIXES.md).

---

## 2. What I Fixed

Every fix was developed on an isolated branch following a strict **test-first discipline** (failing test committed first, followed by fix, verified green, merged via `--no-ff`):

1. **Secrets & Environment (`fix/secrets-and-env`)**
   - Untracked `backend/.env` from git (`git rm --cached`).
   - Created `backend/.env.example` with secure instructions and documented key rotation.
   - Updated `.gitignore` to prevent tracking `.env` and SQLite database files.
   - *Commits*: `71b4239`, *Merge*: `74632df`.

2. **Cross-Tenant Isolation & Role Scoping (`fix/tenant-isolation`)**
   - Added automated isolation test suite (`backend/tests/test_isolation.py`).
   - Enforced database membership check in `/auth/select-org` before minting tokens.
   - Scoped `/dashboard` strictly to active token's `m.org_id` and rejected mismatched `org_id` with `403 Forbidden`.
   - Verified multi-company consultant scoping (`ravi@consult.test` can only view admin dashboard when active in Bluepeak).
   - *Commits*: `7156b2e`, `5070784`, *Merge*: `75d122f`.

3. **Seniority Hierarchy & Score Calculation (`fix/scoring-and-adaptation`)**
   - Replaced string comparison in `questions_for` with numeric rank mapping `{"junior": 1, "mid": 2, "senior": 3, "lead": 4}`.
   - Fixed department score math to compute respondent averages correctly within the 1.0–5.0 scale.
   - Unified maturity level calculation using `utils.maturity_level`.
   - *Commits*: `47852d7`, `1d7f970`, *Merge*: `f847821`.

4. **Authentication & Cryptography (`fix/auth`)**
   - Upgraded password hashing to salted `pbkdf2:sha256:600000$<salt>$<hash>` with constant-time comparison (`hmac.compare_digest`).
   - Maintained backward-compatible verification for legacy SHA-256 hashes so demo logins continue working seamlessly.
   - Fixed `datetime.utcnow()` deprecation in `models.py` (reducing pytest deprecation warnings from 71 to 1).
   - *Commits*: `29421f3`, `05595d1`, *Merge*: `cf2cf03`.

5. **AI Output Validation & Eval Harness (`fix/ai-output-validation`)**
   - Created `parse_and_validate_ai_output()` with markdown fence stripping, regex JSON extraction, integer clamping (1–5), word number conversion, and risk flag whitelisting.
   - Implemented prompt injection defenses: `<employee_answer>` boundary encapsulation, 1000-character input limits, and pinned temperature 0.0.
   - Added deterministic safe fallback on model timeout or refusal.
   - Built offline AI eval harness in `backend/tests/test_ai_eval.py` running against `backend/tests/fixtures/eval_inputs.json`.
   - *Commits*: `fdb1b74`, `bb8cb80`, *Merge*: `5364857`.

6. **Client Request Features (`feat/client-request`)**
   - Implemented minimum group size privacy (<5 respondents grouped under `"Other teams (anonymized)"`).
   - Implemented Right to Delete endpoint (`DELETE /reports/me`) with immediate cascade to dashboard.
   - Transformed frontend admin dashboard from a raw `<pre>` JSON dump into a modern executive view.
   - *Commits*: `0ab9c87`, `5953746`, *Merge*: `f85a4c1`.

7. **Original Feature: Diagnostic Retake & Progress Tracking (`feat/retake-and-progress`)**
   - Added `Membership.last_assessment_summary` to archive prior diagnostic scores and risk flags.
   - Made submissions idempotent by cleanly replacing prior responses.
   - Computed progress delta (`score_delta`, `resolved_risks`, `new_risks`) displayed in employee reports.
   - *Commits*: `be1a78d`, `eb9e036`, *Merge*: `dce052f`.

8. **Tests, CI & Tooling (`chore/tests-and-ci`)**
   - Added GitHub Actions CI (`.github/workflows/ci.yml`) running tests and frontend build on push/PR.
   - Added one-command setup scripts (`scripts/setup.ps1` and `scripts/setup.sh`).
   - Added one-command test scripts (`scripts/test.ps1` and `scripts/test.sh`).
   - Added automated verification demo script (`scripts/demo.ps1` and `scripts/demo.sh`).
   - *Commits*: `c3f6618`, *Merge*: `af4035b`.

---

## 3. What I Deliberately Left (And Why)

1. **External OAuth / SSO (Google, SAML, Okta)**:
   - *Reasoning*: The existing token-based authentication is secure with salted PBKDF2 and org-scoped JWTs. Adding SAML/Okta requires third-party enterprise credentials and introduces significant scope without solving core architectural risks.
2. **Dynamic / Configurable Anonymity Thresholds per Organization**:
   - *Reasoning*: Northwind explicitly requested a threshold of 5. Hardcoding `ANONYMITY_THRESHOLD = 5` satisfies legal/HR requirements cleanly without adding unnecessary schema complexity before enterprise admin settings exist.
3. **Soft Deletion / Audit Log of Erasure**:
   - *Reasoning*: Northwind HR explicitly requested that upon deletion, *"it must disappear from every dashboard immediately"*. Retaining soft-deleted records poses GDPR Article 17 compliance risks if employee PII persists. Hard deletion was chosen for compliance and simplicity.

---

## 4. Client Request: Handling & Questions

Northwind HR requested two changes:
1. **No small groups (<5 people) on the dashboard.**
2. **Right to delete answers and personal report immediately.**

### Implementation:
- In `backend/app/routes/dashboard.py`, any department with `< 5` respondents is grouped into `"Other teams (anonymized)"`. The composite group computes and displays the collective respondent average score and maturity level upon refresh.
- In `backend/app/routes/reports.py`, `DELETE /reports/me` permanently purges all employee responses and clears archived progress snapshots, immediately cascading to personal reports and organizational dashboard numbers upon refresh.

### Questions for Northwind HR & Legal:
1. When small departments (<5 respondents) are grouped under `"Other teams (anonymized)"`, we currently calculate the collective group average and maturity level. Does legal prefer displaying this collective team score, or would you prefer the score to be completely suppressed until the company reaches a higher total threshold?
2. After an employee deletes their answers, are they allowed to retake the diagnostic immediately from a clean slate, or is there a required cooling-off period between evaluation cycles?
3. Should company-wide top risk flags also enforce a minimum frequency threshold (e.g. hiding risks with only 1 occurrence) to prevent deductive identification in small companies?

---

## 5. Original Feature: Diagnostic Retake & "What Changed" Progress

- **The Problem**: Diagnostic submission was non-idempotent (retakes appended duplicate rows to `responses`, distorting metrics), and employees had no way to know if their AI safety habits or training actually improved their score over time.
- **The Solution**: Idempotent re-submission + progress comparison:
  - When an employee retakes the diagnostic, their previous score and risk flags are archived into `Membership.last_assessment_summary`, and active responses are replaced.
  - The report computes a deterministic delta: `score_delta` (+/-), `resolved_risks`, and `new_risks`.
  - The UI renders an informative **"What Changed Since Your Last Diagnostic"** card with green/red indicators and resolved risk summaries.
- **Why this over alternatives**: Solves a root database corruption bug while turning a static quiz into a continuous learning cycle without unprovable LLM hallucinations.

---

## 6. How AI Tools Were Used, and Where They Got It Wrong

AI coding tools were used throughout this project for rapid code review, generating adversarial test fixtures, writing boilerplate tests, and identifying edge cases.

### Most Instructive AI Mistakes (From `docs/AI_LOG.md`):

1. **Test-Fixture Drop/Recreate Bias & SQLite Schema Drift (`memberships.last_assessment_summary`)**:
   - **What Happened**: When adding the diagnostic retake feature (`feat/retake-and-progress`), the AI added `last_assessment_summary` to `models.Membership`. It then ran `pytest`, which passed with 100% green status because `conftest.py` calls `seed.run()`, which drops all tables (`Base.metadata.drop_all()`) and recreates them from scratch in `test.db`. The AI falsely assumed that calling `Base.metadata.create_all()` in `main.py` would update existing databases (like `backend/aipulse.db`). In reality, SQLAlchemy's `create_all()` emits `CREATE TABLE IF NOT EXISTS` and **never alters existing tables or adds new columns**. When the application started against `aipulse.db` and a user logged in, SQLAlchemy queried `memberships.last_assessment_summary`, throwing:
     ```
     sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such column: memberships.last_assessment_summary
     ```
   - **How It Was Fixed**:
     1. Updated `aipulse.db` with `ALTER TABLE memberships ADD COLUMN last_assessment_summary JSON`.
     2. Built defensive auto-migration `init_db()` in `backend/app/db.py` (executed at startup by `main.py`) that uses SQLAlchemy's `inspect(engine)` to auto-detect and apply missing columns on startup.
     3. Added regression test `backend/tests/test_migration.py` verifying legacy databases automatically migrate without data loss.
   - **The Lesson**: Automated tests that drop and recreate test databases create a blind spot for schema migrations. Never assume `create_all()` migrates existing database schemas.

2. **Python Runtime Environment & Shell State Discrepancy**:
   - **What Happened**: During the initial environment bring-up, the host environment had an experimental Python 3.14 pre-release build as its default `python`. The AI assistant initially attempted to execute `pip install -r requirements.txt` against Python 3.14. Because `pydantic-core` wheels for Windows did not yet exist for Python 3.14, pip attempted to build from source using `maturin`, failing with a Windows temp file lock `[WinError 32]`. Furthermore, when the developer ran `uvicorn app.main:app --reload`, the AI assistant initially assumed the user had activated the virtual environment in their PowerShell session. In reality, the user was running in a global PowerShell session where `.venv\Scripts` was not in PATH, and the system Python lacked `sqlalchemy`.
   - **The Lesson**: The AI assistant learned that environment state must never be assumed. Reliable enterprise projects must provide self-contained virtual environments, clear path-agnostic scripts (`scripts/setup.ps1`, `scripts/test.ps1`), and resilient documentation rather than assuming specific shell activation states.

---

## 7. How to Run, Test, and Demo

### Quick Start (One Command)

**Windows (PowerShell)**:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

**Linux / macOS (Bash)**:
```bash
./scripts/setup.sh
```

### Manual Start

1. **Backend**:
   ```bash
   cd backend
   # Using Python 3.13 or 3.12:
   python -m venv .venv
   .\.venv\Scripts\pip install -r requirements.txt   # (source .venv/bin/activate on Mac/Linux)
   .\.venv\Scripts\python -m app.seed
   .\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev                                      # http://localhost:5173
   ```

### Running Tests

Execute the full automated test suite:
```powershell
.\scripts\test.ps1     # or ./scripts/test.sh on Unix
```

### Running the Verification Demo

Run the automated 5-part proof script:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\demo.ps1
```
*(On Mac/Linux: `./scripts/demo.sh`)*

### Demo Accounts (Password: `pulse123`)
- `asha@northwind.test`: Admin at Northwind Logistics
- `meera@bluepeak.test`: Admin at Bluepeak Retail
- `ravi@consult.test`: Consultant (Employee at Northwind, Admin at Bluepeak)
- `priya@northwind.test`: Employee at Northwind (Support)
- `dev@northwind.test`: Lead Engineer at Northwind

---

## 8. Known Gaps / Limitations / What's Next

1. **Live LLM Cost & Rate Limiting**: While `AI_MODE=mock` is deterministic and tested, running `AI_MODE=live` currently lacks token bucket rate limiting per employee or organization. Next step: add Redis-backed token bucket rate limits.
2. **Organization-Level Export**: While the dashboard displays anonymized departments, enterprise clients frequently request CSV/Excel exports for board reporting. Next step: implement an export endpoint enforcing the same `<5` anonymity threshold.
3. **Database Migration Framework**: Development schema synchronization is handled automatically on startup via `init_db()` in `app/db.py` (inspecting existing tables and executing non-destructive `ALTER TABLE` statements). For enterprise production with large schema evolutions, rolling deployments, or downgrade support, integrate Alembic for versioned migration tracking.
