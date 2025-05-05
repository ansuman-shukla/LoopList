from datetime import datetime, timezone
from typing import Optional, Annotated, Any, List
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from bson import ObjectId

# Updated PyObjectId for Pydantic v2 compatibility
def validate_object_id(v: Any) -> str:
    if v is None or v == '':
        # Generate a new ObjectId instead of returning None
        return str(ObjectId())
    if not ObjectId.is_valid(v):
        raise ValueError(f"Invalid ObjectId: '{v}'")
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]

class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    hashed_password: str
    friend_ids: List[PyObjectId] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str
        }

class User(UserBase):
    id: PyObjectId = Field(alias="_id")
    friend_ids: List[PyObjectId] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str
        }

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
