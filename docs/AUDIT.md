# AI Pulse Codebase Security & Quality Audit

Conducted on: 2026-10-27  
Repository: `ElevanteAI/ai-pulse` (Fork: `Raph1710/ai-pulse`)

---

## Executive Summary

The inherited AI Pulse codebase provides a foundation for role-adaptive AI maturity diagnostics and team-level risk reporting. However, an in-depth audit reveals multiple **Critical** security and multi-tenancy vulnerabilities, **High** mathematical and logic errors in scoring and adaptation, fragile AI output ingestion vulnerable to malformed responses and prompt injection, and committed production secrets.

This document prioritizes all findings by severity, details reproduction steps, and outlines concrete actions.

---

## Prioritized Findings Table

| ID | Severity | Area | Location | Description | Verification | Planned Action |
|---|---|---|---|---|---|---|
| **SEC-01** | **Critical** | Multi-Tenancy / IDOR | `backend/app/routes/dashboard.py:24-32` | Cross-company dashboard leakage: `org_dashboard` accepts `org_id` as query parameter and only verifies `m.role == 'admin'`, never verifying `m.org_id == org_id`. An admin of Company B can read all departments, employee counts, scores, and risk flags of Company A. | **Reproduced**: Calling `/dashboard?org_id=1` with Bluepeak admin token succeeds (HTTP 200) and leaks Northwind data. | **Fix now**: Scope dashboard strictly to active token's `m.org_id` and reject mismatched `org_id`. |
| **SEC-02** | **Critical** | Multi-Tenancy / Auth | `backend/app/routes/auth_routes.py:33-37` | Unrestricted org token minting: `/auth/select-org` accepts arbitrary `org_id` and mints an org-scoped JWT without verifying that the authenticated user belongs to that organization. | **Reproduced**: Non-member calling `/auth/select-org` with target `org_id` receives valid signed JWT for that org. | **Fix now**: Verify user membership in requested `org_id` before minting token; return 403 Forbidden on mismatch. |
| **SEC-03** | **Critical** | Secrets Management | `backend/.env:1` | Hardcoded production secret committed to repository: `SECRET_KEY=pulse-7f3a9c2e1b-prod` is tracked in git. No `.env.example` exists. | **Reproduced**: `git ls-files backend/.env` confirms file is tracked in git history. | **Fix now**: Untrack `backend/.env`, add `backend/.env.example`, ensure `.gitignore` excludes `.env`, document key rotation. |
| **SEC-04** | **High** | Cryptography / Auth | `backend/app/auth.py:13-18` | Unsalted SHA-256 password hashing: passwords hashed using single-round unsalted SHA-256, susceptible to rainbow tables and fast offline GPU cracking. | **Reproduced**: Inspection of `hash_password` shows raw `hashlib.sha256(password.encode()).hexdigest()`. | **Fix now**: Upgrade to PBKDF2-HMAC-SHA256 with cryptographically secure random salt, with fallback verification for legacy SHA-256 hashes. |
| **LOGIC-01** | **High** | Business Logic / Adaptation | `backend/app/services/questions.py:18` | Question adaptation string comparison bug: Seniority comparison uses lexicographical comparison (`seniority < q.get("min_seniority")`). In Python, `"lead" < "mid"` and `"lead" < "senior"` evaluate to `True`. Lead roles miss mid- and senior-level questions. | **Reproduced**: `pytest tests/test_questions.py` fails with `AssertionError: assert 'mgr-policy' in ...` for lead manager. | **Fix now**: Define explicit seniority hierarchy `['junior', 'mid', 'senior', 'lead']` with numeric rank comparison. |
| **AI-01** | **High** | AI Resilience / Schema | `backend/app/services/scoring.py:8`, `backend/app/services/llm.py:46` | Unvalidated model output and unhandled JSON exceptions: Raw model output is parsed via `json.loads(raw)` without handling markdown code fences (```` ```json ````), missing keys, string scores (`"four"`), out-of-range scores (e.g. 7), or hallucinated risk flags. Crashes with unhandled 500 error. | **Reproduced**: Inspecting `mock_ai_responses.json` shows entries with markdown fences and out-of-rubric scores/flags. Unhandled parsing crashes. | **Fix now**: Implement robust extractor (strip markdown fences, regex JSON extraction), validate against schema, clamp scores to 1-5, filter flags to whitelist, and provide deterministic safe fallback. |
| **AI-02** | **High** | AI Safety / Injection | `backend/app/services/llm.py:41` | Prompt injection and unbounded input: User answer is formatted directly into prompt string (`PROMPT.format(question=question, answer=answer)`) without length limits or role boundaries, allowing system prompt override or instruction evasion. | **Reproduced**: Code inspection of `PROMPT.format` in `llm.py`. | **Fix now**: Enforce max character limit (1000 chars), sanitize input, separate system instructions from user content in chat messages, and test against adversarial inputs. |
| **DATA-01** | **High** | Data Integrity / Scoring | `backend/app/routes/dashboard.py:48` | Mathematical error in department average calculation: `avg = sum(scores) / len(dept_members)`. `sum(scores)` is sum across all questions from all respondents. Dividing total question points by member count inflates scores by number of questions (e.g. 20 instead of 4.0) and improperly skews averages by non-respondents. Also `level_for` and `maturity_level` have conflicting thresholds. | **Reproduced**: Running dashboard on seeded data yields mathematically flawed numbers and mismatched maturity levels. | **Fix now**: Calculate average score per respondent or per response correctly, and unify maturity level classification. |
| **DATA-02** | **High** | Data Integrity / Idempotency | `backend/app/routes/diagnostic.py:36-54` | Non-idempotent diagnostic submissions: Submitting diagnostic multiple times appends duplicate rows for each question to `responses`, skewing all historical metrics and breaking retakes. | **Reproduced**: Calling `/diagnostic/submit` twice doubles response rows for user. | **Fix now**: Support clean submissions/retakes by archiving or replacing prior responses for the active diagnostic cycle. |
| **PRIV-01** | **High** | Privacy / Anonymity | `CLIENT_REQUEST.md`, `backend/app/routes/dashboard.py` | Lack of minimum group size suppression: Departments with <5 respondents display disaggregated scores and risk flags, exposing individual employee answers to leadership. | **Verified via client request**: Client request specifies <5 respondents must be grouped or masked. | **Fix now**: Implement <5 anonymity threshold grouping into `"Other teams"` on the dashboard. |
| **PRIV-02** | **High** | Privacy / Data Retention | `CLIENT_REQUEST.md`, `backend/app/routes/reports.py` | Missing Right to Delete: Employees have no mechanism to purge their diagnostic answers and personal report. | **Verified via client request**: Client request requires employee self-service deletion. | **Fix now**: Implement `DELETE /reports/me` endpoint with cascade removal from dashboard aggregations. |
| **UX-01** | **Medium** | Frontend / UX | `frontend/src/pages/Dashboard.jsx:15` | Admin dashboard is unstyled raw JSON: `Dashboard.jsx` outputs `<pre>{JSON.stringify(data, null, 2)}</pre>` with a `TODO` comment. | **Reproduced**: Viewing dashboard in browser shows unstyled JSON dump. | **Fix now**: Build clean, modern executive dashboard displaying department maturity cards, anonymity grouping, and risk breakdown. |
| **TEST-01** | **Medium** | Quality Assurance | `backend/tests/test_api.py:25-30` | Misleading test assertion: `test_admin_cannot_see_other_org` tests Asha requesting `org_id=1` (her own org) instead of another company, asserting success and creating a false sense of security. | **Reproduced**: Code inspection of `test_api.py:25-30`. | **Fix now**: Replace with comprehensive cross-tenant isolation test suite (`test_isolation.py`). |
| **CI-01** | **Medium** | DevOps / Team-Readiness | Root repository | Missing automated CI pipeline and setup scripts: No GitHub Actions workflow exists to enforce tests, linting, or formatting on push/PR. Setup steps are manual. | **Verified**: No `.github/` folder in repo. | **Fix now**: Add `.github/workflows/ci.yml` and unified setup script. |
| **CODE-01** | **Low** | Code Health / Deprecation | `backend/app/models.py:55` | `datetime.utcnow()` deprecation: `datetime.utcnow()` is deprecated in Python 3.12+ and produces 28 pytest warnings. | **Reproduced**: Pytest logs 28 `DeprecationWarning`s. | **Fix now**: Replace with `datetime.now(timezone.utc)`. |

---

## Detailed Audit Notes

### 1. Multi-Tenancy & Data Isolation (SEC-01, SEC-02)
Multi-tenancy is the foundational promise of AI Pulse because enterprise clients and cross-company consultants (such as `ravi@consult.test`) interact with multiple organizations.
- In `backend/app/routes/auth_routes.py`, `select_org` blindly trusts `body.org_id`. Any user who logs in can request an org token for any organization without being a member of it.
- In `backend/app/routes/dashboard.py`, `org_dashboard` accepts `org_id: int` as a query parameter. It checks whether the caller's active role is `"admin"`, but does NOT verify that `m.org_id == org_id`. Thus, an admin of Company B can access Company A's internal metrics.
- Solution: Remove trust in client-supplied `org_id`. Verify memberships strictly in `select-org`, and enforce that `dashboard` operates exclusively on `m.org_id`.

### 2. Adaptation Logic Bug (LOGIC-01)
In `backend/app/services/questions.py`:
```python
if seniority < q.get("min_seniority", "junior"):
    continue
```
In Python, strings compare lexicographically:
- `'lead' < 'mid'` is `True` because `'l' < 'm'`
- `'lead' < 'senior'` is `True` because `'l' < 's'`
As a consequence, users with seniority `"lead"` were completely omitted from mid- and senior-level questions, failing `test_lead_manager_gets_policy_questions`.
The fix is to rank levels explicitly: `LEVELS = {"junior": 1, "mid": 2, "senior": 3, "lead": 4}`.

### 3. AI Reliability, Schema Validation & Prompt Injection (AI-01, AI-02)
- In `backend/app/services/scoring.py`, `score_open_answer` does `json.loads(raw)`. In `backend/data/mock_ai_responses.json`, responses include markdown fences (```` ```json {"score": 4...} ``` ````), string scores (`"four"`), out-of-range scores (7), missing reason strings, and fabricated flags.
- Real LLMs frequently emit markdown fences, conversational prefix text, or malformed JSON under load or rate limits.
- Solution: Implement a resilient extractor and parser with schema validation, bounds clamping (1-5), flag whitelisting against `['customer_data_shared', 'confidential_data_shared', 'unreviewed_output', 'policy_unaware']`, and deterministic fallback on model timeout or refusal.
- In `backend/app/services/llm.py`, raw user input is interpolated into `PROMPT.format`. User answers must be length-limited, and prompt structures should separate instruction from evaluated user text.

### 4. Mathematical Inaccuracies in Dashboards (DATA-01)
- `dashboard.py` currently computes `avg = sum(scores) / len(dept_members)`. Because `scores` is a flat list of individual question scores (multiple questions per respondent), this divides total points by the total employee headcount rather than computing the average respondent maturity score.
- If a department has 2 respondents answering 5 questions with score 4 each, `sum(scores)` is 40. With `len(dept_members) = 2`, `avg` becomes 20 (on a 1-5 scale!).
- Furthermore, `utils.maturity_level` (<2, <3, <4) conflicts with `dashboard.level_for` (<1.5, <2.5, <3.5). These must be unified.

### 5. Client Request (PRIV-01, PRIV-02)
Northwind HR explicitly requested:
1. Minimum group size: If a department has <5 completed diagnostics, hide or group it under "Other teams" to prevent de-anonymization.
2. Right to delete: Allow any employee to purge their diagnostic answers immediately.
Both are essential for enterprise compliance and privacy.

---

## Action Plan by Branch

1. `docs/audit`: Commit this audit, AI log, and architectural decision records.
2. `fix/secrets-and-env`: Untrack `.env`, add `.env.example`, update `.gitignore`.
3. `fix/tenant-isolation`: Automated isolation test suite, fix `/auth/select-org` and `/dashboard` IDOR vulnerabilities.
4. `fix/scoring-and-adaptation`: Correct seniority ordering, fix math errors in department averages, unify maturity thresholds.
5. `fix/auth`: PBKDF2 password hashing with legacy fallback, fix UTC datetime deprecations.
6. `fix/ai-output-validation`: Robust JSON extraction, schema validation, score clamping, flag whitelisting, eval harness with adversarial tests.
7. `feat/client-request`: <5 anonymity threshold grouping ("Other teams"), employee `DELETE /reports/me`.
8. `feat/retake-and-progress`: Original feature — diagnostic retake & progress tracking ("What Changed Since Last Diagnostic").
9. `chore/tests-and-ci`: GitHub Actions CI pipeline, setup script, demo script.
10. `docs/readme`: Comprehensive README, walkthrough demo script, code tour, and final report.
