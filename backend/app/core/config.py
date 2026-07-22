from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "local"
    debug: bool = False
    cors_allowed_origins: list[str] = ["http://localhost:3000"]

    database_url: str = "postgresql+psycopg://kozmu_app:change-me-app-role-password@localhost:5432/kozmu_mester"
    # Elevated (owner/superuser) connection used only by Alembic — RLS is never
    # enforced against this role, so runtime request handling must never use it.
    migrations_database_url: str | None = None

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 14

    gcs_bucket_name: str = "kozmu-mester-documents"
    google_application_credentials: str | None = None

    anthropic_api_key: str | None = None

    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
