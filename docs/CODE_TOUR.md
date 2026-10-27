# AI Pulse Code Tour & Live Defense Guide

This guide is designed for live technical explanation and debugging without AI assistance. It covers every significant change, where the code lives, why it was designed this way, and three practical "break it" scenarios with exact debugging steps.

---

## 1. Tenant Isolation & Access Control
- **Where**: `backend/app/routes/auth_routes.py` (lines 33–44) and `backend/app/routes/dashboard.py` (lines 14–27).
- **What it does**: 
  1. In `/auth/select-org`, verifies the database has an existing `Membership` record for `(user.id, body.org_id)` before issuing an organization-scoped JWT.
  2. In `/dashboard`, automatically binds the query to the authenticated `m.org_id` from the JWT token. If the client passes an `org_id` query parameter, it strictly enforces that `org_id == m.org_id` (otherwise returning `403 Forbidden`).
- **Why**: Eliminates Insecure Direct Object Reference (IDOR). An admin from Company B (e.g. Meera at Bluepeak) can never inspect Company A's (Northwind's) departmental stats or employee risk flags. Multi-company users (e.g. Ravi) must operate strictly within their active organization context.
- **Key Files**: 
  - Implementation: `backend/app/routes/auth_routes.py`, `backend/app/routes/dashboard.py`
  - Automated Tests: `backend/tests/test_isolation.py`

---

## 2. Seniority Hierarchy & Question Adaptation
- **Where**: `backend/app/services/questions.py` (lines 12–30).
- **What it does**: Maps seniority levels to an integer rank:
  ```python
  SENIORITY_RANKS = {"junior": 1, "mid": 2, "senior": 3, "lead": 4}
  ```
  Compares `user_rank < min_rank`.
- **Why**: Python string comparison is lexicographical. Alphabetically, `"lead" < "mid"` and `"lead" < "senior"` evaluate to `True`. Because of this bug, Lead Engineers and Lead Managers were excluded from all intermediate and senior questions.
- **Key Files**:
  - Implementation: `backend/app/services/questions.py`
  - Automated Tests: `backend/tests/test_questions.py`

---

## 3. Department Scoring Math & Unified Maturity Thresholds
- **Where**: `backend/app/routes/dashboard.py` (lines 35–65) and `backend/app/utils.py` (lines 1–11).
- **What it does**: 
  1. Computes the average maturity score *per respondent*, then averages respondent scores across the team.
  2. Unifies the maturity thresholds across the entire application:
     - `< 2.0`: Beginner
     - `< 3.0`: Exploring
     - `< 4.0`: Practitioner
     - `>= 4.0`: Leader
- **Why**: The inherited code divided `sum(scores)` across all questions by `len(dept_members)` (the total headcount). Because each respondent answers ~5 questions, scores were inflated up to ~25 (destroying the 1–5 scale), while non-respondents artificially dragged down the denominator.
- **Key Files**:
  - Implementation: `backend/app/routes/dashboard.py`, `backend/app/utils.py`
  - Automated Tests: `backend/tests/test_scoring.py`

---

## 4. AI Output Validation, Schema Clamping & Fallbacks
- **Where**: `backend/app/services/scoring.py` and `backend/app/services/llm.py`.
- **What it does**: 
  1. `_clean_markdown()` strips markdown code blocks (```` ```json ... ``` ````).
  2. Extracts JSON via regex if direct parsing fails.
  3. Clamps scores strictly between 1 and 5 (handles word numbers like `"four"`).
  4. Whitelists risk flags against `['customer_data_shared', 'confidential_data_shared', 'unreviewed_output', 'policy_unaware']`.
  5. Separates system instructions from user input via `<employee_answer>` encapsulation to resist prompt injection.
  6. Implements deterministic fallback `{score: 3, reason: "...", flags: []}` on model timeouts or refusals.
- **Why**: Real LLMs (and the repository's canned mock responses) output markdown fences, string scores, scores out of bounds (e.g. 7), and hallucinated flags. Without defensive parsing, unhandled exceptions cause HTTP 500 crashes during diagnostic submissions.
- **Key Files**:
  - Implementation: `backend/app/services/scoring.py`, `backend/app/services/llm.py`
  - Automated Tests & Fixtures: `backend/tests/test_ai_eval.py`, `backend/tests/fixtures/eval_inputs.json`

---

## 5. Client Request: Small Group Anonymity & Right to Delete
- **Where**: `backend/app/routes/dashboard.py` (lines 30–75) and `backend/app/routes/reports.py` (lines 48–56).
- **What it does**:
  1. **Anonymity Threshold (<5 respondents)**: Any department with fewer than 5 completed diagnostics is consolidated into `"Other teams (anonymized)"`. If total responses in `"Other teams"` are still `< 5`, scores are suppressed to prevent de-anonymization.
  2. **Right to Delete**: `DELETE /reports/me` permanently purges the employee's `Response` rows, immediately updating reports and dashboard metrics.
- **Why**: Fulfills Northwind Legal and HR requirements for employee privacy and GDPR Article 17 compliance.
- **Key Files**:
  - Implementation: `backend/app/routes/dashboard.py`, `backend/app/routes/reports.py`
  - Frontend: `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Report.jsx`
  - Automated Tests: `backend/tests/test_client_request.py`

---

## 6. Original Feature: Diagnostic Retake & "What Changed" Progress
- **Where**: `backend/app/routes/diagnostic.py` (lines 37–52), `backend/app/routes/reports.py` (lines 24–36), and `backend/app/models.py` (line 41).
- **What it does**:
  1. Makes diagnostic submission idempotent: prior responses are archived into `Membership.last_assessment_summary` before replacing them.
  2. Computes progress delta (`score_delta`, `resolved_risks`, `new_risks`).
  3. Displays a "What Changed Since Your Last Diagnostic" card in the report.
- **Why**: Prevents duplicate response accumulation in the database and provides tangible progress feedback to employees.
- **Key Files**:
  - Implementation: `backend/app/routes/diagnostic.py`, `backend/app/routes/reports.py`
  - Automated Tests: `backend/tests/test_retake_progress.py`

---

## Three Live "Break It" Scenarios & Debugging Playbook

### Scenario A: A reviewer asks: "What if someone sends an invalid org_id string like 'abc' or negative ID to `/dashboard`?"
- **How to test live**:
  ```bash
  curl -H "Authorization: Bearer <TOKEN>" "http://127.0.0.1:8000/dashboard?org_id=-999"
  ```
- **What happens**: FastAPI and Pydantic validate query parameters. If `org_id` is an invalid type, FastAPI returns `422 Unprocessable Entity`. If it is a negative integer or does not match `m.org_id`, line 21 in `dashboard.py` catches it: `org_id != m.org_id -> raise HTTPException(403)`.
- **How to debug live**: Open `backend/app/routes/dashboard.py`, inspect line 21, and run `pytest tests/test_isolation.py`.

### Scenario B: A reviewer asks: "What if the LLM returns an empty string or completely refuses due to content filter?"
- **How to test live**:
  In `backend/app/services/scoring.py`, pass `""` or `"I cannot fulfill this request"` to `parse_and_validate_ai_output`.
- **What happens**: `parse_and_validate_ai_output` catches `json.JSONDecodeError`, regex extraction fails safely, and it immediately returns `dict(FALLBACK_RESULT)` (`{"score": 3, "reason": "Automated evaluation fallback applied.", "flags": []}`). The submission succeeds with HTTP 200 without raising a 500 error.
- **How to debug live**: Open `backend/app/services/scoring.py`, check `FALLBACK_RESULT` definition, and run `pytest tests/test_ai_eval.py`.

### Scenario C: A reviewer asks: "What happens if a user submits a diagnostic twice simultaneously (race condition)?"
- **How to test live**:
  Send two concurrent POST requests to `/diagnostic/submit`.
- **What happens**: Both transactions run within SQLAlchemy sessions. In `submit`, `db.query(models.Response).filter_by(membership_id=m.id).delete()` ensures existing active responses are wiped before inserting the new set.
- **How to debug live**: Open `backend/app/routes/diagnostic.py`, check lines 40–51, and run `pytest tests/test_retake_progress.py`.
