from bson import ObjectId
from app.db.mongodb import db, connect_to_mongo, close_mongo_connection
import asyncio

async def check_loop():
    # Connect to MongoDB
    await connect_to_mongo()

    # Check if the loop exists
    loop = await db.db.loops.find_one({'_id': ObjectId('68176af256f090a643eb6c67')})
    print(f'Loop found: {loop is not None}')
    if loop:
        print(f'Loop data: {loop}')

    # Close the connection
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(check_loop())
