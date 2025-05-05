from datetime import datetime, date, timezone
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId

from .user import PyObjectId

class CompletionBase(BaseModel):
    completion_date: date

class CompletionCreate(CompletionBase):
    pass

class CompletionInDB(CompletionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    loop_id: PyObjectId
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat()
        }

class Completion(CompletionBase):
    id: PyObjectId = Field(alias="_id")
    loop_id: PyObjectId
    user_id: PyObjectId
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat()
        }
