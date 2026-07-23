import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import RoleCode


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID | None
    email: EmailStr
    full_name: str
    is_active: bool
    role: RoleCode


class UserMe(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID | None
    role: RoleCode


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    role: RoleCode


class UserUpdate(BaseModel):
    is_active: bool
