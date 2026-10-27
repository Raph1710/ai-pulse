# AI Assistant Honest Learning & Correction Log

This log records every instance where the AI agent made an incorrect assumption, faced environment discrepancies, introduced or observed flawed logic, or caught near-misses.

---

### Entry 1: Python Runtime Environment & Windows File Lock Discrepancy
- **Date/Time**: 2026-10-27 21:28
- **Context**: Running `pip install -r requirements.txt` and starting the backend server.
- **What Happened**: The host system default python was Python 3.14 pre-release (`pythoncore-3.14-64`). Pip installation failed because `pydantic-core` prebuilt wheels for Windows did not exist for Python 3.14, triggering a source build with `maturin` that failed due to a `[WinError 32]` file access conflict in Windows Temp.
- **Correction**: Discovered Python 3.13 was also installed on the machine. Created a dedicated Python 3.13 virtual environment (`.venv`), installed all requirements cleanly with prebuilt wheels, and seeded `aipulse.db`.
- **Near-Miss / Assumption**: When instructing how to run the backend, initially assumed running `python -m uvicorn` would invoke the virtualenv Python. However, because PowerShell had not activated `.venv`, running `python` invoked system Python 3.14 (missing `sqlalchemy`), and running `uvicorn` failed with command not found because `.venv\Scripts` was not in PATH. Corrected instructions to provide explicit full paths (`.\.venv\Scripts\python -m uvicorn app.main:app --reload`) and proper activation commands.

---

### Entry 2: Misleading Existing Test (`test_admin_cannot_see_other_org`)
- **Date/Time**: 2026-10-27 22:33
- **Context**: Code review of existing test suite in `backend/tests/test_api.py`.
- **What Happened**: The previous developer had created a test named `test_admin_cannot_see_other_org`:
  ```python
  def test_admin_cannot_see_other_org(client):
      headers, _ = login(client, "asha@northwind.test", "Northwind Logistics")
      r = client.get("/dashboard?org_id=1", headers=headers)
      assert r.status_code == 200
  ```
  Asha is an admin of Northwind Logistics (`org_id=1`). The test was querying her *own* organization, expecting 200, and asserting that other organizations were blocked without ever actually requesting `org_id=2`!
- **How It Was Caught**: Line-by-line inspection of test inputs and fixtures. An actual test querying `org_id=2` with Asha's token returned 200 and leaked Bluepeak's departments.
- **Resolution**: Replaced with automated cross-tenant isolation test suite (`test_isolation.py`) and updated `test_admin_cannot_see_other_org` to query `org_id=2` and assert 403 Forbidden.

---

### Entry 3: Variable Scope Omission in `reports.py` Refactoring
- **Date/Time**: 2026-10-27 22:53
- **Context**: Adding progress tracking delta calculation in `backend/app/routes/reports.py`.
- **What Happened**: While editing `my_report` to compute resolved vs. new risk flags, the line defining `flags` was accidentally displaced below the progress block that referenced `flags`, triggering:
  `NameError: name 'flags' is not defined`
- **How It Was Caught**: Caught immediately by running the automated pytest suite (`tests/test_retake_progress.py`), which failed on `NameError`.
- **Resolution**: Immediately restored `flags = sorted({f for r in rows for f in (r.flags or [])})` prior to the progress comparison block. Re-ran pytest to confirm clean green pass.

---

### Entry 4: Client Request Anonymity Impact on Existing Test Assertion
- **Date/Time**: 2026-10-27 22:56
- **Context**: Verifying full test suite after implementing Client Request (small group suppression <5).
- **What Happened**: `test_admin_dashboard` in `test_api.py` asserted `assert len(r.json()["departments"]) == 4`. Before the client request, Northwind exposed all 4 departments individually (Sales, Support, Eng, HR). After implementing the client's mandatory <5 privacy threshold, all 4 departments (each having 0 or 1 respondent) were properly consolidated into a single anonymized `"Other teams (anonymized)"` group (`len == 1`), causing the legacy test assertion to fail (`assert 1 == 4`).
- **How It Was Caught**: Full test suite execution across all test files.
- **Resolution**: Updated `test_admin_dashboard` to assert `assert len(depts) == 1`, `assert depts[0]["department"] == "Other teams (anonymized)"`, and `assert depts[0]["employees"] == 10`, accurately validating the privacy grouping.
