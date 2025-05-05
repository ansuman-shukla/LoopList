from motor.motor_asyncio import AsyncIOMotorClient
from ..core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db = MongoDB()

async def connect_to_mongo():
    """Connect to MongoDB."""
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.MONGODB_DB_NAME]
    print(f"Connected to MongoDB at {settings.MONGODB_URL}")

async def close_mongo_connection():
    """Close MongoDB connection."""
    if db.client:
        db.client.close()
        print("Closed connection with MongoDB")
