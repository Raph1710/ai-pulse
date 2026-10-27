# Client Request Evaluation & Implementation Plan

> **From:** HR team, Northwind Logistics  
> **Subject:** AI Pulse pilot: two changes before rollout  
> **Received:** Post-developer departure  
>
> *"Hi team, our legal and HR teams reviewed the AI Pulse pilot and need two changes before we can roll it out:*
>
> *1. **No small groups on the dashboard.** If a department has fewer than 5 people who completed the diagnostic, leadership must not see that department's scores or risks on their own. Group them under "Other teams" or hide them, but individuals must never be identifiable.*
> *2. **Right to delete.** Any employee must be able to delete all their answers and their report themselves, and it must disappear from every dashboard immediately.*
>
> *Thanks, Northwind HR"*

---

## 1. Technical & Privacy Interpretation

1. **Anonymity Threshold (k-Anonymity = 5)**:
   In organizations with small teams (e.g. Engineering with 2 members, HR with 1 member), publishing departmental AI maturity or specific risk flags (e.g. `customer_data_shared`) allows leadership to easily de-anonymize which individual employee gave which answer or made which disclosure.
   Departments with strictly fewer than 5 completed diagnostics must NOT be displayed individually. Their headcounts and response tallies are aggregated into a single `"Other teams"` category. If the consolidated `"Other teams"` group has fewer than 5 total responses, numerical scores are completely masked (`"Insufficient responses for anonymity (<5)"`).

2. **Right to Delete (GDPR / CCPA Compliance & Employee Agency)**:
   Any employee must have a self-service capability to permanently delete their diagnostic answers, risk flags, and generated assessment scores for their active organization.
   Once deleted, their contribution must immediately be excluded from all departmental and company-wide averages and risk rankings.

---

## 2. Risk & Impact Analysis

- **Privacy & Legal**:
  - Without the 5-person threshold, presenting team scores breaches reasonable employee expectations of anonymity and may violate European GDPR / German Works Council (Betriebsrat) workplace monitoring rules.
  - The right to delete fulfills GDPR Article 17 ("Right to Erasure") and fosters employee trust in voluntary AI diagnostic completion.
- **Security & Multi-Tenancy**:
  - Deletion must be strictly scoped to `m.id` (the employee's membership in the active organization context). An employee belonging to two organizations (e.g. Ravi) deleting their Northwind data must NOT affect their Bluepeak profile or vice-versa.
  - An employee must NEVER be able to delete another employee's records.
- **Effect on Other Tenants**:
  - The 5-person grouping rule is enforced globally across all tenant dashboards, ensuring consistent privacy protection across every client company.

---

## 3. What Was Built vs. What Was Deferred

### Built in this iteration:
- **Server-Side Anonymity Grouping (`/dashboard`)**:
  - Departments with `>= 5` completed responses are shown individually.
  - Departments with `< 5` completed responses are aggregated into an `"Other teams"` group.
  - If the `"Other teams"` group also has `< 5` responses, scores are suppressed to avoid trivial de-anonymization.
- **Self-Service Erasure Endpoint (`DELETE /reports/me`)**:
  - Permanently purges all `models.Response` records tied to the authenticated user's active membership.
  - Cascades immediately to reports (`/reports/me` returns `"Not assessed"`) and real-time dashboard aggregates.
- **Frontend User Interface**:
  - Added "Delete my diagnostic data" action with confirmation modal on the employee Report page.
  - Transformed the admin dashboard from a raw `<pre>` JSON dump into a modern executive view with visual indicators for anonymized groups.

### Deferred:
- **Configurable Thresholds per Tenant**:
  - Fixed at `5` as requested. While some enterprises may prefer `k=7` or `k=10`, dynamic policy configuration is deferred until enterprise administration settings are introduced.
- **Soft-Delete / Audit Log of Erasure**:
  - The client specifically stated *"it must disappear from every dashboard immediately"*. We implemented immediate hard deletion of response content. An immutable audit log (`User X requested deletion on Timestamp Y`) was deferred to prevent storing residual PII without client policy agreement.

---

## 4. Concrete Questions for the Client (Northwind HR & Legal)

Before expanding this feature in production, we should clarify:

1. **Handling of the Consolidated "Other Teams" Category**:
   If the combined total of all small departments is still less than 5 people (e.g. 3 people across two small departments), we currently suppress the average score entirely. Does legal approve this suppression behavior, or would you prefer the "Other teams" row to be completely hidden from the table?

2. **Re-taking the Diagnostic Post-Deletion**:
   After an employee deletes their answers, should they be immediately permitted to take the diagnostic again from a clean slate, or is there a mandatory waiting period between evaluation windows?

3. **Risk Flag Aggregation**:
   Top company risks are currently aggregated across the organization. If a unique risk flag is reported only once in the entire company by someone in a small department, should singleton risk flags below a frequency threshold (e.g. < 3 occurrences) also be suppressed to prevent deductive attribution?
