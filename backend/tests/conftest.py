import os
from pathlib import Path

# Owner/superuser connection — used to create the test DB and run migrations.
# PostgreSQL RLS is never enforced against this role (see docs/02-adatbazis-terv.md),
# so it must never be what the application itself connects as.
TEST_ADMIN_DATABASE_URL = os.environ.get(
    "TEST_ADMIN_DATABASE_URL", "postgresql+psycopg://kozmu:kozmu@localhost:5432/kozmu_mester_test"
)
# Restricted role the application (and therefore the tests exercising it)
# actually connects as — this is the one RLS policies apply to.
TEST_APP_DATABASE_URL = os.environ.get(
    "TEST_APP_DATABASE_URL",
    "postgresql+psycopg://kozmu_app:change-me-app-role-password@localhost:5432/kozmu_mester_test",
)

os.environ["DATABASE_URL"] = TEST_APP_DATABASE_URL
os.environ["MIGRATIONS_DATABASE_URL"] = TEST_ADMIN_DATABASE_URL

import uuid  # noqa: E402

import psycopg  # noqa: E402
import pytest  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from alembic import command  # noqa: E402

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _maintenance_dsn() -> str:
    # Same server/credentials as TEST_ADMIN_DATABASE_URL, but targeting the
    # default `postgres` maintenance database so we can create/drop the test DB.
    return TEST_ADMIN_DATABASE_URL.replace("+psycopg", "").rsplit("/", 1)[0] + "/postgres"


@pytest.fixture(scope="session", autouse=True)
def _test_database():
    db_name = TEST_ADMIN_DATABASE_URL.rsplit("/", 1)[1]
    with psycopg.connect(_maintenance_dsn(), autocommit=True) as conn:
        conn.execute(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)')
        conn.execute(f'CREATE DATABASE "{db_name}"')

    alembic_cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_ADMIN_DATABASE_URL)
    command.upgrade(alembic_cfg, "head")

    from app.db.seed import seed_providers, seed_roles

    seed_roles()
    seed_providers()

    yield

    with psycopg.connect(_maintenance_dsn(), autocommit=True) as conn:
        conn.execute(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)')


@pytest.fixture(scope="session")
def db_engine():
    # Arranging test fixtures (creating tenants/users across tenants) is
    # test-setup, not the thing under test — use the admin connection so RLS
    # never gets in the way of fixture data creation.
    return create_engine(TEST_ADMIN_DATABASE_URL)


@pytest.fixture
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def make_tenant(db_session):
    from app.models.tenant import Tenant

    def _make(name: str = "Teszt Kft.") -> "Tenant":
        tenant = Tenant(name=name)
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant

    return _make


@pytest.fixture
def make_user(db_session):
    from app.auth.password import hash_password
    from app.models.role import Role
    from app.models.user import User

    def _make(
        tenant_id: uuid.UUID | None,
        role_code: str,
        email: str = "teszt@example.com",
        password: str = "TesztJelszo123!",
    ) -> "User":
        role = db_session.query(Role).filter(Role.code == role_code).one()
        user = User(
            tenant_id=tenant_id,
            role_id=role.id,
            email=email,
            hashed_password=hash_password(password),
            full_name="Teszt Elek",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    return TestClient(app)
