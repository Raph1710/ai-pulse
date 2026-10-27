# Original Feature: Diagnostic Retake & "What Changed" Progress Tracking

1. **The problem**: The existing `/diagnostic/submit` was non-idempotent; retakes appended duplicate rows to `responses`, skewing averages and breaking subsequent reports, while employees had no way to see if training or changed habits actually improved their maturity over time.
2. **Who it is for**: Employees taking follow-up diagnostics to measure their personal growth, and team leads who need to know if team AI training actually moved the needle.
3. **Why this over alternatives**: Fixes the root data integrity bug (unbounded response duplication) while converting a static one-off assessment into an ongoing improvement loop, using transparent deterministic deltas rather than unprovable LLM assertions.
4. **What we deliberately left out**: Multi-year time-series warehousing and historical chart plotting; we store a lean previous-cycle summary directly on the membership model (`last_assessment_summary: JSON`) to keep migrations and operations simple and debuggable.
5. **How it was tested**: Automated suite in `backend/tests/test_retake_progress.py` testing re-submission idempotency, score delta computation (+/-), resolved vs. newly flagged risks, and UI rendering of the progress card on the Report page.
