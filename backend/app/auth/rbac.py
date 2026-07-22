from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from app.api.deps import CurrentUser, get_current_user
from app.models.enums import RoleCode


def require_roles(*allowed_roles: RoleCode) -> Callable[[CurrentUser], CurrentUser]:
    """FastAPI dependency factory — restricts an endpoint to the given roles.

    Usage: `current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN))`
    """

    def _dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nincs jogosultságod ehhez a művelethez",
            )
        return current_user

    return _dependency
