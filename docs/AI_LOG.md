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


---

### Entry 5: Database Schema Drift and `create_all()` Migration Fallacy
- **Date/Time**: 2026-10-28 11:00
- **Context**: Adding diagnostic retake & progress tracking (`feat/retake-and-progress`), which introduced the `last_assessment_summary` JSON column to `models.Membership`.
- **What Happened**:
  1. The column `last_assessment_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)` was added to `models.Membership` in `backend/app/models.py`.
  2. Automated tests were executed using `pytest`. In `backend/tests/conftest.py`, the test fixture calls `seed.run()`, which executes `Base.metadata.drop_all(bind=engine)` and drops and recreates `test.db` from scratch on each run.
  3. Because `test.db` was dropped and recreated, all 25 tests passed cleanly with 100% green status.
  4. The AI assistant incorrectly assumed that because `Base.metadata.create_all(bind=engine)` was called in `backend/app/main.py`, existing database instances like `backend/aipulse.db` would automatically update their schema.
  5. In reality, SQLAlchemy's `create_all()` emits `CREATE TABLE IF NOT EXISTS`, which is a no-op if the table already exists. It **never alters existing tables or adds newly defined columns**.
  6. As a result, the pre-existing development database `aipulse.db` was left in a drifted state lacking `memberships.last_assessment_summary`.
  7. When a user ran the application against `aipulse.db` and attempted to log in (`POST /auth/login`), SQLAlchemy constructed a `SELECT` statement loading all mapped columns of `Membership`:
     ```sql
     SELECT memberships.id, memberships.user_id, memberships.org_id, memberships.department_id,
            memberships.role, memberships.job_role, memberships.seniority, memberships.last_assessment_summary
     FROM memberships
     WHERE ? = memberships.user_id
     ```
     This immediately crashed with:
     ```
     sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such column: memberships.last_assessment_summary
     ```
- **How It Was Caught**: Reported by developer runtime execution with full traceback during user authentication.
- **Resolution**:
  1. **Schema Remediation**: Safely updated `backend/aipulse.db` with `ALTER TABLE memberships ADD COLUMN last_assessment_summary JSON;`, preserving all existing user records, organizational memberships, and responses without data loss.
  2. **Startup Auto-Migration**: Implemented `init_db(bind_engine)` in `backend/app/db.py` (called by `backend/app/main.py` at startup). It uses SQLAlchemy's `inspect(engine)` to inspect existing tables at boot. If `memberships` exists but lacks `last_assessment_summary`, it automatically issues `ALTER TABLE memberships ADD COLUMN last_assessment_summary JSON`.
  3. **Automated Migration Test**: Added `backend/tests/test_migration.py` which sets up a legacy database missing `last_assessment_summary`, runs `init_db()`, and verifies that the column is added cleanly and queries succeed without `OperationalError`.
- **Key Lessons for AI Assistants**:
  - **The Test-Fixture Drop/Recreate Blind Spot**: Automated test suites that drop and recreate test databases (`drop_all` / `create_all`) provide false confidence regarding database schema changes. They test greenfield database generation, but mask database drift against existing persisted databases.
  - **`create_all()` is Not a Migration Engine**: SQLAlchemy's `create_all()` never adds columns or modifies existing tables. Whenever modifying SQLAlchemy models, always provide automated schema synchronization or versioned migration scripts.
