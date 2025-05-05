import asyncio
from bson import ObjectId
import sys
import os

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.mongodb import db, connect_to_mongo, close_mongo_connection
from app.core.config import settings

async def fix_user_ids():
    """
    Fix user_id format in loops collection.
    This script checks all loops and ensures that user_id is stored as an ObjectId.
    """
    # Connect to MongoDB
    await connect_to_mongo()
    
    print("Checking loops collection for user_id format issues...")
    
    # Get all loops
    loops = await db.db.loops.find({}).to_list(length=1000)
    print(f"Found {len(loops)} loops in the database")
    
    fixed_count = 0
    string_ids = 0
    object_ids = 0
    other_types = 0
    
    # Check each loop
    for loop in loops:
        loop_id = loop.get("_id")
        user_id = loop.get("user_id")
        
        if isinstance(user_id, str):
            string_ids += 1
            print(f"Loop {loop_id} has string user_id: {user_id}")
            
            # Check if it's a valid ObjectId
            if ObjectId.is_valid(user_id):
                # Fix the user_id format
                print(f"Fixing user_id format for loop {loop_id}")
                await db.db.loops.update_one(
                    {"_id": loop_id},
                    {"$set": {"user_id": ObjectId(user_id)}}
                )
                fixed_count += 1
            else:
                print(f"Warning: Loop {loop_id} has invalid ObjectId string: {user_id}")
        elif isinstance(user_id, ObjectId):
            object_ids += 1
        else:
            other_types += 1
            print(f"Warning: Loop {loop_id} has unexpected user_id type: {type(user_id)}")
    
    print("\nSummary:")
    print(f"Total loops: {len(loops)}")
    print(f"Loops with string user_id: {string_ids}")
    print(f"Loops with ObjectId user_id: {object_ids}")
    print(f"Loops with other user_id types: {other_types}")
    print(f"Fixed {fixed_count} loops")
    
    # Close MongoDB connection
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(fix_user_ids())
