from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId

from ...core.config import settings
from ...core.security import create_access_token, get_password_hash
from ...db.mongodb import db
from ...models.user import Token, UserCreate, UserInDB
from ..deps import authenticate_user, get_user_by_email

router = APIRouter()

@router.post("/signup", response_model=Token)
async def signup(user_in: UserCreate) -> Any:
    """
    Create a new user.
    """
    try:
        # Check if user already exists
        existing_user = await get_user_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create new user
        hashed_password = get_password_hash(user_in.password)
        # Get user data excluding password
        user_data = user_in.model_dump(exclude={"password"})

        user_data["hashed_password"] = hashed_password

        # Create a new user with a generated ObjectId
        try:
            # Generate a new ObjectId for the user
            user_data["_id"] = str(ObjectId())
            new_user = UserInDB(**user_data)

            # Get user dict with alias
            user_dict = new_user.model_dump(by_alias=True)

            # Convert _id from string to ObjectId for MongoDB
            if '_id' in user_dict and user_dict['_id']:
                user_dict['_id'] = ObjectId(user_dict['_id'])
            else:
                # If _id is missing or empty, generate a new one and log it
                print("Warning: _id is missing or empty in user_dict, generating a new one")
                user_dict['_id'] = ObjectId()

            result = await db.db.users.insert_one(user_dict)
        except Exception as e:
            print(f"Error creating user document: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating user document: {str(e)}",
            )

        if not result.inserted_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user",
            )

        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=str(result.inserted_id), expires_delta=access_token_expires
        )

        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error and return a generic error message
        print(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}",
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}
