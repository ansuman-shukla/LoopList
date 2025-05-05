import asyncio
import sys
import os
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

async def fix_empty_ids():
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Find users with empty IDs
    users_with_empty_ids = await db.users.find({"_id": ""}).to_list(length=100)
    print(f"Found {len(users_with_empty_ids)} users with empty IDs")
    
    for user in users_with_empty_ids:
        # Generate a new ObjectId
        new_id = ObjectId()
        print(f"Updating user {user['email']} with new ID: {new_id}")
        
        # Create a copy of the user with the new ID
        user_copy = user.copy()
        del user_copy['_id']  # Remove the empty ID
        
        # Insert the user with the new ID
        result = await db.users.insert_one({"_id": new_id, **user_copy})
        print(f"Inserted user with new ID: {result.inserted_id}")
        
        # Delete the user with the empty ID
        delete_result = await db.users.delete_one({"_id": ""})
        print(f"Deleted {delete_result.deleted_count} users with empty IDs")
    
    # Close the connection
    client.close()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(fix_empty_ids())
