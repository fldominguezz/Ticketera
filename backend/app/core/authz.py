from typing import Annotated
from fastapi import Depends, HTTPException, status

from app.api.deps import get_current_active_user
from app.db.models import User

class Authorize:
    def __init__(self, permissions: list[str]):
        self.required_permissions = set(permissions)

    def __call__(self, user: Annotated[User, Depends(get_current_active_user)]):
        
        user_permissions = set()
        for user_role in user.roles:
            for role_permission in user_role.role.permissions:
                user_permissions.add(role_permission.permission.name)

        if not self.required_permissions.issubset(user_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )

# Example Usage:
# @router.get("/some-data", dependencies=[Depends(Authorize(["ticket:read"]))])
