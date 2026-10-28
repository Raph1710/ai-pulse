from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def init_db(bind_engine=engine):
    """Initializes tables and performs lightweight automatic schema synchronization.

    Ensures newly added model columns (such as memberships.last_assessment_summary)
    are safely migrated into existing database instances without requiring manual
    table drops or data re-seeding.
    """
    Base.metadata.create_all(bind=bind_engine)
    try:
        inspector = inspect(bind_engine)
        tables = inspector.get_table_names()
        if "memberships" in tables:
            columns = [c["name"] for c in inspector.get_columns("memberships")]
            if "last_assessment_summary" not in columns:
                with bind_engine.begin() as conn:
                    conn.execute(text("ALTER TABLE memberships ADD COLUMN last_assessment_summary JSON"))
    except Exception as exc:
        print(f"[db] Schema synchronization notice: {exc}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
