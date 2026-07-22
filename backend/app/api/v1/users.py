from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, get_current_user
from app.schemas.user import UserMe

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
def read_current_user(current_user: CurrentUser = Depends(get_current_user)) -> UserMe:
    return UserMe(id=current_user.id, tenant_id=current_user.tenant_id, role=current_user.role)
