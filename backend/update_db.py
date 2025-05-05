import os
import sys
import asyncio
from pymongo import MongoClient
from bson import ObjectId

# MongoDB connection string
MONGODB_URL = "mongodb+srv://ansuman-shukla:ansuman@cluster0.zkpcq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
MONGODB_DB_NAME = "looplist_db"

async def update_database():
    # Connect to MongoDB
    client = MongoClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    
    print("Connected to MongoDB")
    
    # Update ansuman to have testuser5 as a friend
    result = db.users.update_one(
        {'_id': ObjectId('68175aa85affb311225a357b')},
        {'$set': {'friend_ids': ['6817b17b575df7d1e94b9215']}}
    )
    print(f'Updated ansuman: {result.modified_count}')
    
    # Verify the update
    user = db.users.find_one({'_id': ObjectId('68175aa85affb311225a357b')})
    print(f'Ansuman after update: {user}')
    
    # Close the connection
    client.close()
    print("Closed connection to MongoDB")

if __name__ == "__main__":
    asyncio.run(update_database())
