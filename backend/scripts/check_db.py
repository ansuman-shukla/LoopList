import asyncio
import sys
import os
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

async def check_db():
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Check users collection
    users_count = await db.users.count_documents({})
    print(f"Total users: {users_count}")
    
    # Check for users with empty IDs
    empty_id_users = await db.users.count_documents({"_id": ""})
    print(f"Users with empty IDs: {empty_id_users}")
    
    # Check loops collection
    loops_count = await db.loops.count_documents({})
    print(f"Total loops: {loops_count}")
    
    # Check for loops with invalid user_id references
    invalid_user_loops = []
    async for loop in db.loops.find():
        user_id = loop.get('user_id')
        if user_id:
            user = await db.users.find_one({"_id": user_id})
            if not user:
                invalid_user_loops.append(loop['_id'])
    
    print(f"Loops with invalid user_id references: {len(invalid_user_loops)}")
    
    # Close the connection
    client.close()

if __name__ == "__main__":
    asyncio.run(check_db())
