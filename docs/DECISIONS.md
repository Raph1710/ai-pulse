# Architectural & Design Decisions

This document records key engineering decisions, evaluated alternatives, and their rationales.

---

## ADR-01: Multi-Tenancy Enforcement in JWT & API Routes
- **Context**: The inherited code accepted `org_id` as a query parameter in `/dashboard?org_id=...` and blindly minted org tokens in `/auth/select-org` without checking membership.
- **Decision**: 
  1. In `/auth/select-org`, strictly query `Membership` for `(user_id, body.org_id)`. If absent, return `403 Forbidden`.
  2. In `/dashboard`, remove reliance on untrusted client `org_id` query param. Use `m.org_id` directly from `current_membership` dependency (or require `org_id == m.org_id` if provided).
- **Alternatives Considered**: Allow admins to pass `org_id` for cross-org administration. Rejected because organizations must remain completely isolated; even consultants must explicitly select an organization context.
- **Impact**: Completely eliminates IDOR vulnerability across multi-tenant boundaries.

---

## ADR-02: Seniority Hierarchy in Role Adaptation
- **Context**: `questions_for` compared string seniority (`seniority < min_seniority`), causing `"lead"` to be lexicographically smaller than `"mid"` and `"senior"`.
- **Decision**: Map seniority strings to an ordered integer rank: `{"junior": 1, "mid": 2, "senior": 3, "lead": 4}` and compare ranks.
- **Alternatives Considered**: Change JSON question schema to numeric levels. Rejected to preserve schema backward compatibility with existing `data/questions.json`.

---

## ADR-03: Password Hashing Upgrade with Legacy Compatibility
- **Context**: Passwords were stored with single-round unsalted SHA-256 (`hashlib.sha256(password.encode()).hexdigest()`).
- **Decision**: Upgrade to PBKDF2-HMAC-SHA256 with a unique random salt (format: `pbkdf2:sha256:600000$<salt>$<hash>`). On `verify_password`, check if hash matches legacy SHA-256 or PBKDF2 format, enabling seamless login for seeded accounts while newly hashed passwords use secure PBKDF2.
- **Alternatives Considered**: Introduce `bcrypt` or `argon2-cffi`. Rejected to avoid introducing binary dependencies that complicate cross-platform installation and CI without a clear necessity over standard library `hashlib.pbkdf2_hmac`.

---

## ADR-04: Resilient AI Output Parsing & Fallback Scoring
- **Context**: `score_open_answer` relied on `json.loads(raw)` with no validation or exception handling, crashing on markdown code blocks (```` ```json ````), missing fields, string scores, and out-of-range ratings present in `mock_ai_responses.json`.
- **Decision**: Implement a defensive JSON extractor that removes markdown fences, extracts JSON objects via regex if necessary, clamps scores to `[1, 5]`, filters flags against an approved whitelist (`['customer_data_shared', 'confidential_data_shared', 'unreviewed_output', 'policy_unaware']`), and returns a safe fallback `{score: 3, reason: "...", flags: []}` on model refusal/parse failure.
- **Alternatives Considered**: Hard failure (raising 502/500). Rejected because a single transient LLM formatting quirk should not crash the user's diagnostic submission or discard their answers.

---

## ADR-05: Client Request Anonymity Threshold (<5 Respondents)
- **Context**: Northwind HR requested that departments with fewer than 5 respondents must not have their scores or risks shown individually to leadership.
- **Decision**: On the dashboard, compute respondent count per department. Departments with `< 5` respondents are grouped under a single synthetic department labeled `"Other teams (anonymized)"` with combined headcount, respondents, and aggregated score. If total respondents across all small departments is also `< 5`, scores are suppressed completely as `"Insufficient responses for anonymity"`.
- **Alternatives Considered**: Hide small departments completely. Grouping under "Other teams" was chosen because the client request specifically said: *"Group them under 'Other teams' or hide them, but individuals must never be identifiable."*

---

## ADR-06: Original Feature — Diagnostic Retake & Progress Tracking
- **Context**: The existing system appends duplicate response rows if an employee retakes the diagnostic, corrupting reports and dashboard metrics. Furthermore, employees have no way to observe progress after training.
- **Decision**: Implement a versioned / cycle-based diagnostic retake: an employee can retake the diagnostic, which cleanly archives/replaces prior responses while preserving a snapshot for progress comparison ("What Changed Since Last Diagnostic"). It reports score delta, resolved risks, and newly flagged areas.
- **Alternatives Considered**: Restrict users to a single submission forever. Rejected because continuous improvement and re-assessment is the core purpose of an AI maturity tool.
