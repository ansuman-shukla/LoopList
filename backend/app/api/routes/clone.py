from typing import Any
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Path
from bson import ObjectId

from ...db.mongodb import db
from ...models.user import User
from ...models.loop import Loop, VisibilityType, StatusType, LoopInDB
from ..deps import get_current_user

router = APIRouter()

@router.post("/clone/{loop_id}", response_model=Loop)
async def clone_loop(
    loop_id: str = Path(..., title="The ID of the loop to clone"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Clone a public loop.
    """
    try:
        print(f"Attempting to clone loop with ID: {loop_id}")
        
        # Validate loop_id
        if not loop_id or not ObjectId.is_valid(loop_id):
            print(f"Invalid loop ID: {loop_id}")
            raise HTTPException(status_code=400, detail="Invalid loop ID format")
        
        # Check if loop exists and is public (or belongs to the user)
        loop = await db.db.loops.find_one({
            "_id": ObjectId(loop_id),
            "$or": [
                {"visibility": VisibilityType.PUBLIC},
                {"user_id": ObjectId(current_user.id)}
            ],
            "status": {"$ne": StatusType.ARCHIVED}
        })
        
        if not loop:
            print(f"Loop not found or not available for cloning: {loop_id}")
            raise HTTPException(status_code=404, detail="Loop not found or not available for cloning")
        
        print(f"Found loop to clone: {loop}")
        
        # Create a new loop based on the original
        new_loop_data = {
            "title": loop["title"],
            "frequency_type": loop["frequency_type"],
            "frequency_details": loop["frequency_details"],
            "start_date": date.today(),
            "visibility": VisibilityType.PRIVATE,
            "status": StatusType.ACTIVE,
            "icon": loop.get("icon"),
            "cover_image_url": loop.get("cover_image_url"),
            "user_id": ObjectId(current_user.id),
            "current_streak": 0,
            "longest_streak": 0,
            "clone_count": 0
        }
        
        # Create a new loop without an _id field (let MongoDB generate it)
        new_loop = LoopInDB(**new_loop_data)
        
        # Convert to dict for MongoDB
        try:
            loop_dict = new_loop.model_dump(by_alias=True, exclude={"id"})
        except AttributeError:
            # Fallback for older Pydantic versions
            loop_dict = new_loop.dict(by_alias=True, exclude={"id"})
        
        # Make sure _id is not in the dict
        if "_id" in loop_dict:
            del loop_dict["_id"]
        
        # Convert date objects to strings for MongoDB
        if 'start_date' in loop_dict and isinstance(loop_dict['start_date'], date):
            loop_dict['start_date'] = loop_dict['start_date'].isoformat()
        
        if 'end_date' in loop_dict and loop_dict['end_date'] is not None and isinstance(loop_dict['end_date'], date):
            loop_dict['end_date'] = loop_dict['end_date'].isoformat()
        
        print(f"Inserting new loop into MongoDB: {loop_dict}")
        
        # Insert the new loop
        result = await db.db.loops.insert_one(loop_dict)
        print(f"Insert result: {result.inserted_id}")
        
        # Increment clone_count on the original loop
        await db.db.loops.update_one(
            {"_id": ObjectId(loop_id)},
            {"$inc": {"clone_count": 1}}
        )
        
        # Retrieve the newly created loop
        created_loop = await db.db.loops.find_one({"_id": result.inserted_id})
        
        if not created_loop:
            print("Error: Could not find the newly created loop")
            raise HTTPException(status_code=500, detail="Failed to retrieve the newly created loop")
        
        print(f"Created loop retrieved from DB: {created_loop}")
        
        # Return the new loop
        return Loop(**created_loop)
        
    except Exception as e:
        print(f"Error in clone_loop: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error cloning loop: {str(e)}")
