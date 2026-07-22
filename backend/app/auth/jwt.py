import uuid
from datetime import UTC, datetime, timedelta
from enum import Enum

from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


class TokenPayload(BaseModel):
    sub: str
    tenant_id: str | None
    role: str
    token_type: TokenType
    exp: datetime


class InvalidTokenError(Exception):
    pass


def _create_token(
    user_id: uuid.UUID,
    tenant_id: uuid.UUID | None,
    role: str,
    token_type: TokenType,
    expires_delta: timedelta,
) -> str:
    expire = datetime.now(UTC) + expires_delta
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id) if tenant_id else None,
        "role": role,
        "token_type": token_type.value,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: uuid.UUID, tenant_id: uuid.UUID | None, role: str) -> str:
    return _create_token(
        user_id,
        tenant_id,
        role,
        TokenType.ACCESS,
        timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )


def create_refresh_token(user_id: uuid.UUID, tenant_id: uuid.UUID | None, role: str) -> str:
    return _create_token(
        user_id,
        tenant_id,
        role,
        TokenType.REFRESH,
        timedelta(days=settings.jwt_refresh_token_expire_days),
    )


def decode_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return TokenPayload(**payload)
    except (JWTError, ValueError) as exc:
        raise InvalidTokenError("A token érvénytelen vagy lejárt") from exc
