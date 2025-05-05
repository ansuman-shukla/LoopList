from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from bson import ObjectId

from .user import PyObjectId

# Only allow the fire heart emoji
FIRE_HEART_EMOJI = "❤️‍🔥"

class ReactionBase(BaseModel):
    emoji: str = FIRE_HEART_EMOJI

    @field_validator('emoji')
    def validate_emoji(cls, v):
        if v != FIRE_HEART_EMOJI:
            return FIRE_HEART_EMOJI
        return v

class ReactionCreate(ReactionBase):
    pass

class ReactionInDB(ReactionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    loop_id: PyObjectId
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

class Reaction(ReactionBase):
    id: PyObjectId = Field(alias="_id")
    loop_id: PyObjectId
    user_id: PyObjectId
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
