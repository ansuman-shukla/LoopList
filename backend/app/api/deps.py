from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from bson import ObjectId

from ..core.config import settings
from ..core.security import verify_password
from ..db.mongodb import db
from ..models.user import TokenPayload, User, UserInDB

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get the current user from the token.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    if not token_data.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token subject",
        )

    try:
        # Ensure token_data.sub is a valid ObjectId
        if not ObjectId.is_valid(token_data.sub):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid user ID format: {token_data.sub}",
            )

        user = await db.db.users.find_one({"_id": ObjectId(token_data.sub)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserInDB(**user)
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Error retrieving user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user: {str(e)}",
        )

async def get_user_by_email(email: str) -> Optional[UserInDB]:
    """
    Get a user by email.
    """
    print(f"get_user_by_email: Looking for user with email: {email}")
    # Make email search case-insensitive
    user = await db.db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    print(f"get_user_by_email: MongoDB query result: {user}")

    if user:
        try:
            # Ensure _id is properly handled
            if '_id' in user and user['_id']:
                user['_id'] = str(user['_id'])
            user_obj = UserInDB(**user)
            print(f"get_user_by_email: Successfully created UserInDB object: {user_obj}")
            return user_obj
        except Exception as e:
            print(f"Error creating UserInDB from database record: {str(e)}")
            print(f"User data: {user}")
            raise
    print(f"get_user_by_email: No user found with email: {email}")
    return None

async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    """
    Authenticate a user.
    """
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
