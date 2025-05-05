import asyncio
from bson import ObjectId
import sys
import os
from datetime import datetime, date

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.mongodb import db, connect_to_mongo, close_mongo_connection
from app.core.config import settings
from app.services.streak_calculator import calculate_streaks

async def fix_completions():
    """
    Fix completions collection and recalculate streaks.
    This script checks all completions and ensures they have valid ObjectIds and dates.
    It also recalculates streaks for all loops.
    """
    # Connect to MongoDB
    await connect_to_mongo()
    
    print("Checking completions collection for issues...")
    
    # Get all completions
    completions = await db.db.completions.find({}).to_list(length=1000)
    print(f"Found {len(completions)} completions in the database")
    
    fixed_count = 0
    deleted_count = 0
    
    # Check each completion
    for completion in completions:
        completion_id = completion.get("_id")
        loop_id = completion.get("loop_id")
        user_id = completion.get("user_id")
        completion_date = completion.get("completion_date")
        
        has_issues = False
        
        # Check for empty or invalid _id
        if not completion_id or completion_id == "":
            print(f"Completion has empty _id: {completion}")
            has_issues = True
        
        # Check for empty or invalid loop_id
        if not loop_id:
            print(f"Completion has empty loop_id: {completion}")
            has_issues = True
        
        # Check for empty or invalid user_id
        if not user_id:
            print(f"Completion has empty user_id: {completion}")
            has_issues = True
        
        # Check for empty or invalid completion_date
        if not completion_date:
            print(f"Completion has empty completion_date: {completion}")
            has_issues = True
        
        if has_issues:
            # Delete the problematic completion
            print(f"Deleting problematic completion: {completion}")
            await db.db.completions.delete_one({"_id": completion_id})
            deleted_count += 1
    
    print(f"Deleted {deleted_count} problematic completions")
    
    # Get all loops
    loops = await db.db.loops.find({}).to_list(length=1000)
    print(f"Found {len(loops)} loops in the database")
    
    # Recalculate streaks for all loops
    for loop in loops:
        loop_id = loop.get("_id")
        try:
            print(f"Recalculating streaks for loop {loop_id}")
            updated_loop = await calculate_streaks(str(loop_id))
            print(f"Updated loop: current_streak={updated_loop.get('current_streak')}, longest_streak={updated_loop.get('longest_streak')}")
            fixed_count += 1
        except Exception as e:
            print(f"Error recalculating streaks for loop {loop_id}: {e}")
    
    print(f"Recalculated streaks for {fixed_count} loops")
    
    # Close MongoDB connection
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(fix_completions())
