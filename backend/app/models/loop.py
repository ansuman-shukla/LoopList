from datetime import datetime, date, timezone
from typing import Optional, Dict, Any, List, Union
from enum import Enum
from pydantic import BaseModel, Field, validator
from bson import ObjectId

from .user import PyObjectId

class FrequencyType(str, Enum):
    DAILY = "daily"
    SPECIFIC_DAYS = "specific_days"
    EVERY_N_DAYS = "every_n_days"
    X_TIMES_PER_WEEK = "x_times_per_week"

class VisibilityType(str, Enum):
    PRIVATE = "private"
    FRIENDS_ONLY = "friends_only"
    PUBLIC = "public"

class StatusType(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class FrequencyDetails(BaseModel):
    days: Optional[List[int]] = None  # For specific_days (0=Sun, 1=Mon, ..., 6=Sat)
    n: Optional[int] = None  # For every_n_days
    count: Optional[int] = None  # For x_times_per_week

    @validator('days')
    def validate_days(cls, v):
        if v is not None:
            for day in v:
                if day < 0 or day > 6:
                    raise ValueError("Days must be between 0 (Sunday) and 6 (Saturday)")
        return v

    @validator('n')
    def validate_n(cls, v):
        if v is not None and v < 1:
            raise ValueError("N must be at least 1")
        return v

    @validator('count')
    def validate_count(cls, v):
        if v is not None:
            if v < 1 or v > 7:
                raise ValueError("Count must be between 1 and 7")
        return v

class LoopBase(BaseModel):
    title: str
    frequency_type: FrequencyType
    frequency_details: Optional[FrequencyDetails] = None
    start_date: date
    end_date: Optional[date] = None
    visibility: VisibilityType = VisibilityType.PRIVATE
    status: StatusType = StatusType.ACTIVE
    icon: Optional[str] = None
    cover_image_url: Optional[str] = None

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v is not None and 'start_date' in values and v < values['start_date']:
            raise ValueError("End date cannot be before start date")
        return v

class LoopCreate(LoopBase):
    pass

class LoopUpdate(BaseModel):
    title: Optional[str] = None
    frequency_type: Optional[FrequencyType] = None
    frequency_details: Optional[FrequencyDetails] = None
    end_date: Optional[date] = None
    visibility: Optional[VisibilityType] = None
    status: Optional[StatusType] = None
    icon: Optional[str] = None
    cover_image_url: Optional[str] = None

class LoopInDB(LoopBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    current_streak: int = 0
    longest_streak: int = 0
    clone_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_streak_update_check: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat()
        }

class Loop(LoopBase):
    id: PyObjectId = Field(alias="_id")
    user_id: PyObjectId
    current_streak: int
    longest_streak: int
    clone_count: int
    created_at: datetime
    updated_at: datetime
    last_streak_update_check: Optional[datetime] = None
    reaction_count: Optional[int] = None
    user_username: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat()
        }
