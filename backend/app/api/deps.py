import uuid
from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.jwt import InvalidTokenError, TokenType, decode_token
from app.db.session import SessionLocal, tenant_scoped_session
from app.models.enums import RoleCode

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class CurrentUser(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID | None
    role: RoleCode


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    try:
        payload = decode_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Érvénytelen hitelesítő adatok",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.token_type != TokenType.ACCESS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token szükséges",
        )

    return CurrentUser(
        id=uuid.UUID(payload.sub),
        tenant_id=uuid.UUID(payload.tenant_id) if payload.tenant_id else None,
        role=RoleCode(payload.role),
    )


def get_tenant_db(
    current_user: CurrentUser = Depends(get_current_user),
) -> Generator[Session, None, None]:
    """Tenant-scoped DB session for regular (non cross-tenant) endpoints.

    Requires the current user to belong to a tenant — super admins/partners
    that operate cross-tenant should use a dedicated endpoint/dependency.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ez a végpont csak tenanthoz kötött felhasználók számára érhető el",
        )
    with tenant_scoped_session(current_user.tenant_id) as db:
        yield db
