import sqlite3
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import init_db
from app import models


def test_schema_migration_adds_missing_column(tmp_path):
    # Setup legacy database path
    db_file = tmp_path / "legacy_test.db"
    conn = sqlite3.connect(str(db_file))
    cur = conn.cursor()

    # Create old memberships table missing last_assessment_summary
    cur.execute("""
        CREATE TABLE memberships (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            org_id INTEGER NOT NULL,
            department_id INTEGER,
            role VARCHAR(20) NOT NULL,
            job_role VARCHAR(40) NOT NULL,
            seniority VARCHAR(20) NOT NULL
        )
    """)
    cur.execute("""
        INSERT INTO memberships (id, user_id, org_id, department_id, role, job_role, seniority)
        VALUES (1, 1, 1, NULL, 'admin', 'manager', 'lead')
    """)
    conn.commit()
    conn.close()

    # Create engine pointing to this legacy database
    legacy_engine = create_engine(f"sqlite:///{db_file}")

    # Prior to running migration, verify column is missing
    conn = sqlite3.connect(str(db_file))
    cols = [c[1] for c in conn.execute("PRAGMA table_info(memberships)").fetchall()]
    assert "last_assessment_summary" not in cols
    conn.close()

    # Run auto-migration
    init_db(bind_engine=legacy_engine)

    # Verify column now exists
    conn = sqlite3.connect(str(db_file))
    updated_cols = [c[1] for c in conn.execute("PRAGMA table_info(memberships)").fetchall()]
    assert "last_assessment_summary" in updated_cols
    conn.close()

    # Verify SQLAlchemy can query the model cleanly without OperationalError
    Session = sessionmaker(bind=legacy_engine)
    db = Session()
    m = db.query(models.Membership).filter_by(id=1).first()
    assert m is not None
    assert m.role == "admin"
    assert m.last_assessment_summary is None
    db.close()
