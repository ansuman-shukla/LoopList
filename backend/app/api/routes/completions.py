from typing import Any, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from bson import ObjectId

from ...db.mongodb import db
from ...models.user import User
from ...models.completion import Completion, CompletionCreate, CompletionInDB
from ...models.loop import Loop, StatusType
from ...services.streak_calculator import calculate_streaks
from ..deps import get_current_user

router = APIRouter()

@router.post("/{loop_id}/complete", response_model=Loop)
async def complete_loop(
    completion_in: Optional[CompletionCreate] = None,
    loop_id: str = Path(..., title="The ID of the loop to complete"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Mark a loop as completed for a specific date.
    """
    try:
        # Debug logging
        print(f"Completing loop: {loop_id} for user: {current_user.id}")
        print(f"Received completion data: {completion_in}")

        # Validate loop_id is a valid ObjectId
        if not ObjectId.is_valid(loop_id):
            raise HTTPException(status_code=400, detail="Invalid loop ID format")

        # Check if loop exists and belongs to user
        try:
            # First try to find the loop by ID only to debug
            any_loop = await db.db.loops.find_one({"_id": ObjectId(loop_id)})
            if any_loop:
                print(f"Loop found with ID {loop_id}, user_id: {any_loop.get('user_id')}")
                print(f"Current user ID: {current_user.id}")

                # Compare user IDs as strings to avoid ObjectId comparison issues
                if str(any_loop.get('user_id')) == str(current_user.id):
                    print(f"User ID match confirmed")
                    loop = any_loop
                else:
                    print(f"User ID mismatch: Loop belongs to {any_loop.get('user_id')}, but current user is {current_user.id}")
                    raise HTTPException(status_code=404, detail="Loop not found or does not belong to current user")
            else:
                print(f"No loop found with ID: {loop_id}")
                raise HTTPException(status_code=404, detail="Loop not found")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            print(f"Error checking loop: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error checking loop: {str(e)}")

        if loop["status"] != StatusType.ACTIVE:
            raise HTTPException(status_code=400, detail="Cannot complete a non-active loop")

        # Use today's date if not provided
        completion_date = date.today()
        if completion_in:
            try:
                completion_date = completion_in.completion_date
                print(f"Using provided completion date: {completion_date}")
            except Exception as e:
                print(f"Error parsing completion date: {str(e)}")
                raise HTTPException(status_code=422, detail=f"Invalid completion date: {str(e)}")
        else:
            print(f"No completion_in provided, using today's date: {completion_date}")

        # Check if completion already exists for this date
        completion_date_str = completion_date.isoformat()
        print(f"Checking for existing completion on date: {completion_date_str}")

        # Use only string representation for dates in MongoDB queries
        existing_completion_query = {
            "loop_id": ObjectId(loop_id),
            "completion_date": completion_date_str
        }
        print(f"Existing completion query: {existing_completion_query}")

        existing_completion = await db.db.completions.find_one(existing_completion_query)

        if existing_completion:
            print(f"Loop already completed for date: {completion_date_str}")
            raise HTTPException(status_code=400, detail="Loop already completed for this date")

        # Create completion - convert date to string for MongoDB
        completion_date_str = completion_date.isoformat()
        completion_data = {
            "_id": ObjectId(),  # Generate a new ObjectId
            "loop_id": ObjectId(loop_id),
            "user_id": ObjectId(current_user.id),
            "completion_date": completion_date_str
        }

        print(f"Creating completion with data: {completion_data}")

        # Skip the Pydantic model and insert directly into MongoDB
        try:
            result = await db.db.completions.insert_one(completion_data)
            print(f"Completion created with ID: {result.inserted_id}")

            # Recalculate streaks
            updated_loop = await calculate_streaks(loop_id)
            print(f"Updated loop streaks: current={updated_loop.get('current_streak')}, longest={updated_loop.get('longest_streak')}")

            return Loop(**updated_loop)
        except Exception as e:
            print(f"Error creating completion: {e}")
            raise HTTPException(status_code=500, detail=f"Error creating completion: {str(e)}")

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Unexpected error in complete_loop: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.delete("/{loop_id}/complete", response_model=Loop)
async def delete_completion(
    completion_date: date,
    loop_id: str = Path(..., title="The ID of the loop completion to delete"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Delete a loop completion for a specific date.
    """
    # Check if loop exists and belongs to user
    loop = await db.db.loops.find_one({
        "_id": ObjectId(loop_id),
        "user_id": ObjectId(current_user.id)
    })

    if not loop:
        raise HTTPException(status_code=404, detail="Loop not found")

    # Convert date to string for MongoDB query
    completion_date_str = completion_date.isoformat()

    # Check if completion exists
    completion = await db.db.completions.find_one({
        "loop_id": ObjectId(loop_id),
        "completion_date": completion_date_str
    })

    if not completion:
        raise HTTPException(status_code=404, detail="Completion not found")

    # Delete completion
    await db.db.completions.delete_one({
        "loop_id": ObjectId(loop_id),
        "completion_date": completion_date_str
    })

    # Recalculate streaks
    updated_loop = await calculate_streaks(loop_id)

    return Loop(**updated_loop)

@router.get("/{loop_id}/calendar", response_model=List[date])
async def get_loop_calendar(
    loop_id: str = Path(..., title="The ID of the loop to get calendar for"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all completion dates for a loop within a date range.
    """
    # Check if loop exists and belongs to user
    loop = await db.db.loops.find_one({
        "_id": ObjectId(loop_id),
        "user_id": ObjectId(current_user.id)
    })

    if not loop:
        raise HTTPException(status_code=404, detail="Loop not found")

    # Build query
    query = {"loop_id": ObjectId(loop_id)}

    if start_date or end_date:
        query["completion_date"] = {}
        if start_date:
            query["completion_date"]["$gte"] = start_date.isoformat()
        if end_date:
            query["completion_date"]["$lte"] = end_date.isoformat()

    # Get completions
    completions = await db.db.completions.find(query).to_list(length=1000)

    # Extract dates
    completion_dates = [completion["completion_date"] for completion in completions]

    return completion_dates

@router.get("/{loop_id}/count", response_model=int)
async def get_completion_count(
    loop_id: str = Path(..., title="The ID of the loop to get completion count for"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get the total number of completions for a loop.
    """
    # Check if loop exists and belongs to user
    loop = await db.db.loops.find_one({
        "_id": ObjectId(loop_id),
        "user_id": ObjectId(current_user.id)
    })

    if not loop:
        raise HTTPException(status_code=404, detail="Loop not found")

    # Count completions
    count = await db.db.completions.count_documents({"loop_id": ObjectId(loop_id)})

    return count
