from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from ...db.mongodb import db
from ...models.user import User
from ..deps import get_current_user

router = APIRouter()

@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current user information.
    """
    return current_user
