import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_tenant_db
from app.auth.password import hash_password
from app.auth.rbac import require_roles
from app.models.enums import RoleCode
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserMe, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

# A tenant-oldali (customer_admin) felhasználókezelés csak az ügyfél oldali
# szerepköröket hozhatja létre — a partner/admin/super_admin szintű
# felhasználókat egy külön, cross-tenant admin felület kezeli majd.
ASSIGNABLE_ROLES = (RoleCode.CUSTOMER_ADMIN, RoleCode.CUSTOMER_USER)


@router.get("/me", response_model=UserMe)
def read_current_user(current_user: CurrentUser = Depends(get_current_user)) -> UserMe:
    return UserMe(id=current_user.id, tenant_id=current_user.tenant_id, role=current_user.role)


def _to_user_read(user: User, role_code_by_id: dict[int, str]) -> UserRead:
    return UserRead(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        role=RoleCode(role_code_by_id[user.role_id]),
    )


@router.get("", response_model=list[UserRead])
def list_users(
    current_user: CurrentUser = Depends(require_roles(RoleCode.CUSTOMER_ADMIN)),
    db: Session = Depends(get_tenant_db),
) -> list[UserRead]:
    users = db.scalars(
        select(User).where(User.tenant_id == current_user.tenant_id).order_by(User.full_name)
    ).all()
    role_code_by_id = {role.id: role.code for role in db.scalars(select(Role)).all()}
    return [_to_user_read(user, role_code_by_id) for user in users]


@router.post("", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    current_user: CurrentUser = Depends(require_roles(RoleCode.CUSTOMER_ADMIN)),
    db: Session = Depends(get_tenant_db),
) -> UserRead:
    if payload.role not in ASSIGNABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Csak 'customer_admin' vagy 'customer_user' szerepkörű felhasználó hozható létre",
        )

    role = db.scalar(select(Role).where(Role.code == payload.role.value))

    user = User(
        tenant_id=current_user.tenant_id,
        role_id=role.id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ez az email cím már foglalt") from exc
    db.refresh(user)

    return _to_user_read(user, {role.id: role.code})


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    current_user: CurrentUser = Depends(require_roles(RoleCode.CUSTOMER_ADMIN)),
    db: Session = Depends(get_tenant_db),
) -> UserRead:
    user = db.scalar(select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    if user is None:
        raise HTTPException(status_code=404, detail="A felhasználó nem található")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Saját magadat nem tudod deaktiválni")

    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)

    role_code_by_id = {role.id: role.code for role in db.scalars(select(Role)).all()}
    return _to_user_read(user, role_code_by_id)
