import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import RoleCode


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID | None
    email: EmailStr
    full_name: str
    is_active: bool


class UserMe(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID | None
    role: RoleCode
