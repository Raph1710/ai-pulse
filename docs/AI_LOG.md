# AI Assistant Honest Learning & Correction Log

This log records instances where the AI agent made an incorrect assumption, faced environment discrepancies, introduced or observed flawed logic, or caught near-misses.

---

### Entry 1: Python Runtime Environment & Windows File Lock Discrepancy
- **Date/Time**: 2026-10-27 21:28
- **Context**: Running `pip install -r requirements.txt` and starting the backend server.
- **What Happened**: The host system default python was Python 3.14 pre-release (`pythoncore-3.14-64`). Pip installation failed because `pydantic-core` wheels for Windows did not exist for Python 3.14, triggering a source build with `maturin` that failed due to a `[WinError 32]` file access conflict in Windows Temp.
- **Correction**: We discovered Python 3.13 was also installed on the machine. We created a dedicated Python 3.13 virtual environment (`.venv`), installed all requirements cleanly with prebuilt wheels, and seeded `aipulse.db`.
- **Near-Miss / Assumption**: When instructing how to run the backend, we initially assumed running `python -m uvicorn` would invoke the virtualenv Python. However, because PowerShell had not activated `.venv`, running `python` invoked system Python 3.14 (missing `sqlalchemy`), and running `uvicorn` failed with command not found because `.venv\Scripts` was not in PATH. We corrected our instructions to provide explicit full paths (`.\.venv\Scripts\python -m uvicorn app.main:app --reload`) and proper activation commands.

---

### Entry 2: Misleading Existing Test (`test_admin_cannot_see_other_org`)
- **Date/Time**: 2026-10-27 22:33
- **Context**: Code review of existing test suite in `backend/tests/test_api.py`.
- **What Happened**: The previous developer had created a test named `test_admin_cannot_see_other_org`. Looking at the code:
  ```python
  def test_admin_cannot_see_other_org(client):
      headers, _ = login(client, "asha@northwind.test", "Northwind Logistics")
      r = client.get("/dashboard?org_id=1", headers=headers)
      assert r.status_code == 200
  ```
  Asha is an admin of Northwind Logistics (`org_id=1`). The test was querying her *own* organization, expecting 200, and asserting that other organizations were blocked without ever actually requesting `org_id=2`!
- **How It Was Caught**: Line-by-line inspection of test inputs and fixtures. An actual test querying `org_id=2` with Asha's token returned 200 and leaked Bluepeak's departments.
- **Resolution**: Marked as a major finding in `docs/AUDIT.md` (TEST-01, SEC-01) and scheduled for replacement with `test_isolation.py`.
