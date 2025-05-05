from app.db.mongodb import db
import asyncio
from bson import ObjectId

async def update_user():
    print("Connected to MongoDB")

    # Update ansuman to have testuser5 as a friend
    result = await db.db.users.update_one(
        {'_id': ObjectId('68175aa85affb311225a357b')},
        {'$set': {'friend_ids': ['6817b17b575df7d1e94b9215']}}
    )
    print(f'Updated ansuman: {result.modified_count}')

    # Verify the update
    user = await db.db.users.find_one({'_id': ObjectId('68175aa85affb311225a357b')})
    print(f'Ansuman after update: {user}')

if __name__ == "__main__":
    asyncio.run(update_user())
