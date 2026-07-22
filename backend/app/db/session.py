import uuid
from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a plain session with no tenant context set.

    Use `get_db_for_tenant` for tenant-scoped requests — this bare session is
    only for endpoints that legitimately span tenants (super admin / auth).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def tenant_scoped_session(tenant_id: uuid.UUID) -> Generator[Session, None, None]:
    """Opens a session with `app.current_tenant_id` set for the connection,
    so PostgreSQL Row Level Security policies enforce tenant isolation even
    if application code forgets a `WHERE tenant_id = ...` filter.
    """
    db = SessionLocal()
    try:
        db.execute(
            text("SELECT set_config('app.current_tenant_id', :tenant_id, true)"),
            {"tenant_id": str(tenant_id)},
        )
        yield db
    finally:
        db.close()
