# 5-Minute Screen-Recording Walkthrough Script

Use this exact script to record your demonstration video. Follow the sequence, execute the commands, and speak the talking points.

---

## Pre-Recording Checklist
- Terminal 1: Repository root (`c:\Users\raphd\OneDrive\Desktop\AI-Pulse\ai-pulse`)
- Terminal 2: Ready for dev servers
- Browser: Open to `http://localhost:5173`

---

## Segment 1: Introduction & Architecture (0:00 – 0:45)
**Action**: Show `git log --oneline --graph -n 12` in the terminal.
**Talking Points**:
> *"Hello, this is a technical review of the hardened, verified, and extended AI Pulse platform. When I inherited this codebase, it suffered from multi-tenant data leaks, broken question adaptation, math errors in dashboard scores, fragile unvalidated AI parsing, and committed secrets. Every fix was implemented using test-driven development on dedicated branches and merged via clean merge commits."*

---

## Segment 2: Running Automated Proofs (0:45 – 1:45)
**Action**: Run the verification demo script:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\demo.ps1
```
*(On Mac/Linux: `./scripts/demo.sh`)*

**Talking Points**:
> *"I've built a one-command verification demo that executes all automated proofs across 5 areas:*
> 1. *Cross-Tenant Isolation: Blocks IDOR attacks where an admin of Company B attempts to read Company A's dashboard.*
> 2. *Role & Seniority Adaptation: Proves the seniority hierarchy bug is fixed so Leads receive senior and mid questions.*
> 3. *AI Output Resilience: Proves markdown stripping, schema clamping, flag filtering, and prompt injection defenses.*
> 4. *Client Request: Proves <5 anonymity threshold grouping and immediate employee right to delete.*
> 5. *Original Feature: Proves diagnostic retake idempotency and progress delta tracking.*
> *All 5 suites pass completely green with 25 passing test cases."*

---

## Segment 3: Code Comparison — Before vs. After (1:45 – 2:45)
**Action**: Show the git diff for tenant isolation and seniority adaptation:
```powershell
git diff 7156b2e..5070784 backend/app/routes/dashboard.py
git diff 47852d7..1d7f970 backend/app/services/questions.py
```
**Talking Points**:
> *"Here is the tenant isolation fix in `dashboard.py`: previously, the endpoint accepted an untrusted `org_id` query parameter and only checked if the caller was an admin. Now, it binds directly to the active token's `m.org_id`, returning 403 Forbidden on any cross-tenant tampering.*
> *In `questions.py`, the previous developer used string comparison `seniority < min_seniority`. Because 'lead' comes before 'mid' alphabetically, leads were skipped from mid-level questions. We introduced explicit rank mapping `junior < mid < senior < lead`."*

---

## Segment 4: Client Request Demonstration (2:45 – 3:45)
**Action**: Switch to browser at `http://localhost:5173`.
1. Sign in as `asha@northwind.test` (password: `pulse123`) and select **Northwind Logistics**.
2. Point out the **Dashboard**:
   - Show the **"Other teams (anonymized)"** table row.
   - Point to the privacy note: Northwind's teams each have < 5 respondents, so individual team scorecards are suppressed to protect employee confidentiality.
3. Sign out and sign in as `priya@northwind.test` (password: `pulse123`).
4. Show Priya's **Report**:
   - Point out her average score and risks.
   - Click **"Delete My Diagnostic Answers"** and confirm.
   - Show immediate update: responses deleted, score returns to "Not assessed".

---

## Segment 5: Original Feature — Diagnostic Retake & "What Changed" (3:45 – 4:45)
**Action**: In Priya's account:
1. Click **"Retake Diagnostic"**.
2. Answer the diagnostic questions thoughtfully with safe practices (no customer data).
3. Click **Submit**.
4. Show the new **"What Changed Since Your Last Diagnostic"** card:
   - Green score delta: `+1.33` (improvement).
   - Resolved Risk: `customer_data_shared` is marked as resolved!
   - Highlight that retakes are now completely idempotent without duplicate database rows.

---

## Segment 6: Conclusion (4:45 – 5:00)
**Action**: Show `.github/workflows/ci.yml` in terminal or editor.
**Talking Points**:
> *"The project is fully team-ready with automated GitHub Actions CI, clean Docker builds, salted PBKDF2 password security, and extensive documentation in `AUDIT.md`, `DECISIONS.md`, and `CODE_TOUR.md`. Thank you."*
