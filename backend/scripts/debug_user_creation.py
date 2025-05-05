import asyncio
import sys
import os
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.user import UserInDB, UserCreate
from app.core.security import get_password_hash

async def debug_user_creation():
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    print("Connected to MongoDB")
    
    # Create test user data
    test_user = UserCreate(
        email="test@example.com",
        username="testuser",
        password="testpassword"
    )
    
    # Hash the password
    hashed_password = get_password_hash(test_user.password)
    
    # Prepare user data
    user_data = test_user.model_dump(exclude={"password"})
    user_data["hashed_password"] = hashed_password
    
    # Generate ObjectId
    user_data["_id"] = str(ObjectId())
    
    print(f"User data before UserInDB creation: {user_data}")
    
    try:
        # Create UserInDB instance
        new_user = UserInDB(**user_data)
        print(f"UserInDB created successfully: {new_user}")
        
        # Convert to dict for MongoDB
        user_dict = new_user.model_dump(by_alias=True)
        
        # Convert _id from string to ObjectId for MongoDB
        if '_id' in user_dict and user_dict['_id']:
            user_dict['_id'] = ObjectId(user_dict['_id'])
        else:
            print("WARNING: _id is missing or empty")
            user_dict['_id'] = ObjectId()
        
        print(f"User dict for MongoDB: {user_dict}")
        
        # Insert into MongoDB
        result = await db.users.insert_one(user_dict)
        print(f"User inserted with ID: {result.inserted_id}")
        
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_user_creation())
