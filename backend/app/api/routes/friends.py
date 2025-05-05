from typing import Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Body
from bson import ObjectId

from ...db.mongodb import db
from ...models.user import User, UserInDB
from ..deps import get_current_user

router = APIRouter()

@router.post("/me/friends", response_model=User)
async def add_friend(
    email: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Add a friend by email.
    """
    print("\n=== ADD FRIEND ENDPOINT START ===")
    print(f"Current user: {current_user.id} ({current_user.email})")
    print(f"Received email to add: {email}")

    # Normalize email to lowercase
    email = email.strip().lower()
    print(f"Normalized email: {email}")

    # Debug: List all collections in the database
    collections = await db.db.list_collection_names()
    print(f"Collections in database: {collections}")

    # Debug: Count total users in the database
    user_count = await db.db.users.count_documents({})
    print(f"Total users in database: {user_count}")

    # Debug: List all users in the database
    all_users = await db.db.users.find({}).to_list(length=100)
    print(f"All users in database:")
    for idx, user in enumerate(all_users):
        print(f"  User {idx+1}: _id={user.get('_id')}, email={user.get('email')}")

    # Try direct MongoDB query with case-insensitive search
    print(f"Trying direct MongoDB query with case-insensitive search for: {email}")
    try:
        # First try exact match
        user_doc = await db.db.users.find_one({"email": email})
        if user_doc:
            print(f"Found user with exact email match: {user_doc.get('email')}")
        else:
            print(f"No exact match found, trying case-insensitive search")
            # Try case-insensitive match
            user_doc = await db.db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
            if user_doc:
                print(f"Found user with case-insensitive match: {user_doc.get('email')}")
            else:
                print(f"No user found with email (case-insensitive): {email}")

                # Try a more flexible search
                print(f"Trying more flexible search")
                user_doc = await db.db.users.find_one({"email": {"$regex": email, "$options": "i"}})
                if user_doc:
                    print(f"Found user with flexible search: {user_doc.get('email')}")
                else:
                    print(f"No user found with flexible search for: {email}")
    except Exception as e:
        print(f"Error during MongoDB query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    if not user_doc:
        print(f"User not found with email: {email}")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email not found"
        )

    # Convert to UserInDB
    try:
        print(f"Converting user document to UserInDB: {user_doc}")
        if '_id' in user_doc and user_doc['_id']:
            user_doc['_id'] = str(user_doc['_id'])
        friend = UserInDB(**user_doc)
        print(f"Successfully converted to UserInDB: {friend}")
    except Exception as e:
        print(f"Error creating UserInDB from database record: {str(e)}")
        print(f"User data: {user_doc}")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing user data: {str(e)}"
        )

    # Check if trying to add self
    if str(friend.id) == str(current_user.id):
        print(f"User tried to add themselves as a friend")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add yourself as a friend"
        )

    # Get current user from DB to ensure we have the latest data
    print(f"Getting current user from DB: {current_user.id}")
    try:
        db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
        print(f"Current user from DB: {db_user}")
    except Exception as e:
        print(f"Error retrieving current user: {str(e)}")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    if not db_user:
        print(f"Current user not found in database: {current_user.id}")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current user not found"
        )

    # Convert to UserInDB
    try:
        print(f"Converting current user document to UserInDB")
        user_in_db = UserInDB(**db_user)
        print(f"Current user converted to UserInDB: {user_in_db}")
    except Exception as e:
        print(f"Error converting current user to UserInDB: {str(e)}")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing user data: {str(e)}"
        )

    # Check if already a friend
    friend_ids = user_in_db.friend_ids or []
    print(f"Current friend IDs: {friend_ids}")

    if str(friend.id) in [str(fid) for fid in friend_ids]:
        print(f"User {friend.id} is already in the friends list")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already in your friends list"
        )

    # Add friend to list
    friend_ids.append(str(friend.id))
    print(f"Updated friend IDs: {friend_ids}")

    # Update current user in database
    try:
        print(f"Updating current user in database with new friend list")
        update_result = await db.db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"friend_ids": friend_ids}}
        )
        print(f"Update result for current user: matched={update_result.matched_count}, modified={update_result.modified_count}")
    except Exception as e:
        print(f"Error updating current user in database: {str(e)}")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    # Now make the relationship bidirectional by adding current user to friend's friend list
    try:
        print(f"Getting friend's current friend list")
        friend_user = await db.db.users.find_one({"_id": ObjectId(friend.id)})
        if not friend_user:
            print(f"Friend user not found in database: {friend.id}")
            print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Friend user not found"
            )

        # Get friend's current friend list
        friend_user_friend_ids = friend_user.get("friend_ids", [])
        if friend_user_friend_ids is None:
            friend_user_friend_ids = []
        print(f"Friend's current friend IDs: {friend_user_friend_ids}")

        # Check if current user is already in friend's friend list
        if str(current_user.id) not in [str(fid) for fid in friend_user_friend_ids]:
            # Add current user to friend's friend list
            friend_user_friend_ids.append(str(current_user.id))
            print(f"Updated friend's friend IDs: {friend_user_friend_ids}")

            # Update friend in database
            update_result = await db.db.users.update_one(
                {"_id": ObjectId(friend.id)},
                {"$set": {"friend_ids": friend_user_friend_ids}}
            )
            print(f"Update result for friend: matched={update_result.matched_count}, modified={update_result.modified_count}")

            # Verify the update was successful
            updated_friend = await db.db.users.find_one({"_id": ObjectId(friend.id)})
            if updated_friend:
                print(f"Friend updated successfully: {updated_friend}")
                if "friend_ids" not in updated_friend or str(current_user.id) not in [str(fid) for fid in updated_friend.get("friend_ids", [])]:
                    print(f"WARNING: Friend's friend_ids field does not contain current user after update!")
                    # Try a different approach with $addToSet
                    retry_result = await db.db.users.update_one(
                        {"_id": ObjectId(friend.id)},
                        {"$addToSet": {"friend_ids": str(current_user.id)}}
                    )
                    print(f"Retry update result: matched={retry_result.matched_count}, modified={retry_result.modified_count}")
            else:
                print(f"WARNING: Could not verify friend update!")
        else:
            print(f"Current user {current_user.id} is already in friend's friend list")
    except Exception as e:
        print(f"Error updating friend in database: {str(e)}")
        # Don't raise an exception here, as we've already updated the current user's friend list
        print("Warning: Could not make friendship bidirectional, but current user's friend list was updated")

    # Return updated user
    try:
        print(f"Getting updated user from database")
        updated_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
        if not updated_user:
            print(f"Updated user not found in database")
            print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Updated user not found"
            )

        print(f"Updated user: {updated_user}")
        user_obj = User(**updated_user)
        print(f"Returning updated user: {user_obj}")
        print("=== ADD FRIEND ENDPOINT END SUCCESS ===\n")
        return user_obj
    except Exception as e:
        print(f"Error retrieving updated user: {str(e)}")
        print("=== ADD FRIEND ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving updated user: {str(e)}"
        )

@router.delete("/me/friends/{friend_id}", response_model=User)
async def remove_friend(
    friend_id: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Remove a friend.
    """
    # Validate friend_id is a valid ObjectId
    if not ObjectId.is_valid(friend_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid friend ID format"
        )

    # Get current user from DB to ensure we have the latest data
    db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current user not found"
        )

    # Convert to UserInDB
    user_in_db = UserInDB(**db_user)

    # Check if friend exists in list
    friend_ids = user_in_db.friend_ids or []
    if friend_id not in [str(fid) for fid in friend_ids]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend not found in your friends list"
        )

    # Remove friend from list
    updated_friend_ids = [str(fid) for fid in friend_ids if str(fid) != friend_id]

    # Update current user in database
    await db.db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"friend_ids": updated_friend_ids}}
    )

    # Now make the relationship removal bidirectional by removing current user from friend's friend list
    try:
        print(f"Getting friend's current friend list")
        friend_user = await db.db.users.find_one({"_id": ObjectId(friend_id)})
        if friend_user:
            # Get friend's current friend list
            friend_user_friend_ids = friend_user.get("friend_ids", [])
            print(f"Friend's current friend IDs: {friend_user_friend_ids}")

            # Remove current user from friend's friend list
            updated_friend_user_friend_ids = [str(fid) for fid in friend_user_friend_ids if str(fid) != str(current_user.id)]

            if len(updated_friend_user_friend_ids) != len(friend_user_friend_ids):
                print(f"Removing current user from friend's friend list")
                # Update friend in database
                await db.db.users.update_one(
                    {"_id": ObjectId(friend_id)},
                    {"$set": {"friend_ids": updated_friend_user_friend_ids}}
                )
                print(f"Friend's friend list updated")
            else:
                print(f"Current user not found in friend's friend list")
        else:
            print(f"Friend user not found in database: {friend_id}")
    except Exception as e:
        print(f"Error updating friend in database: {str(e)}")
        # Don't raise an exception here, as we've already updated the current user's friend list
        print("Warning: Could not make friendship removal bidirectional, but current user's friend list was updated")

    # Return updated user
    updated_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
    return User(**updated_user)

@router.get("/me/friends", response_model=List[User])
async def get_friends(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all friends of the current user.
    """
    print("\n=== GET FRIENDS ENDPOINT START ===")
    print(f"Current user: {current_user.id} ({current_user.email})")

    # Get current user from DB to ensure we have the latest data
    try:
        db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
        print(f"Current user from DB: {db_user}")
    except Exception as e:
        print(f"Error retrieving current user: {str(e)}")
        print("=== GET FRIENDS ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    if not db_user:
        print(f"Current user not found in database: {current_user.id}")
        print("=== GET FRIENDS ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current user not found"
        )

    # Convert to UserInDB
    try:
        user_in_db = UserInDB(**db_user)
        print(f"Current user converted to UserInDB: {user_in_db}")
    except Exception as e:
        print(f"Error converting current user to UserInDB: {str(e)}")
        print("=== GET FRIENDS ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing user data: {str(e)}"
        )

    # Get friend IDs
    friend_ids = user_in_db.friend_ids or []
    print(f"Friend IDs: {friend_ids}")

    # If no friends, return empty list
    if not friend_ids:
        print("No friends found, returning empty list")
        print("=== GET FRIENDS ENDPOINT END SUCCESS ===\n")
        return []

    # Convert string IDs to ObjectId for MongoDB query
    try:
        object_ids = [ObjectId(fid) for fid in friend_ids if ObjectId.is_valid(fid)]
        print(f"Valid ObjectIds: {object_ids}")
    except Exception as e:
        print(f"Error converting friend IDs to ObjectIds: {str(e)}")
        print("=== GET FRIENDS ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing friend IDs: {str(e)}"
        )

    # Get all friends
    try:
        friends = await db.db.users.find({"_id": {"$in": object_ids}}).to_list(length=100)
        print(f"Found {len(friends)} friends in database")
    except Exception as e:
        print(f"Error retrieving friends from database: {str(e)}")
        print("=== GET FRIENDS ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    # Convert to User models
    try:
        result = [User(**friend) for friend in friends]
        print(f"Returning {len(result)} friends")
        print("=== GET FRIENDS ENDPOINT END SUCCESS ===\n")
        return result
    except Exception as e:
        print(f"Error converting friends to User models: {str(e)}")
        print("=== GET FRIENDS ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing friend data: {str(e)}"
        )

@router.get("/test", response_model=dict)
async def test_endpoint() -> Any:
    """
    Simple test endpoint to verify API is working.
    """
    print("\n=== TEST ENDPOINT CALLED ===\n")
    return {"status": "ok", "message": "API is working"}

@router.get("/test-public", response_model=dict)
async def test_public_endpoint() -> Any:
    """
    Simple test endpoint to verify API is working without authentication.
    """
    print("\n=== TEST PUBLIC ENDPOINT CALLED ===\n")
    return {"status": "ok", "message": "API is working without authentication"}

@router.get("/friends-test", response_model=List[dict])
async def get_friends_test() -> Any:
    """
    Test endpoint to get friends without authentication.
    """
    print("\n=== GET FRIENDS TEST ENDPOINT START ===")

    # Return a mock list of friends for testing
    mock_friends = [
        {"_id": str(ObjectId()), "email": "test1@example.com", "username": "Test User 1", "friend_ids": [], "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
        {"_id": str(ObjectId()), "email": "test2@example.com", "username": "Test User 2", "friend_ids": [], "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
    ]

    print(f"Returning {len(mock_friends)} mock friends")
    print("=== GET FRIENDS TEST ENDPOINT END SUCCESS ===\n")
    return mock_friends

@router.get("/debug", response_model=dict)
async def debug_endpoint() -> Any:
    """
    Debug endpoint to check the router configuration.
    """
    print("\n=== DEBUG ENDPOINT CALLED ===\n")

    # Get all routes in this router
    routes = []
    for route in router.routes:
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": list(route.methods) if hasattr(route, "methods") else None,
        })

    return {
        "router_prefix": "/friends",
        "routes": routes,
        "message": "Debug information for friends router"
    }

@router.get("/check-user", response_model=dict)
async def check_user_exists(
    email: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Check if a user exists by email.
    """
    print("\n=== CHECK USER EXISTS ENDPOINT START ===")
    print(f"Checking if user exists with email: {email}")

    # Normalize email to lowercase
    email = email.strip().lower()
    print(f"Normalized email: {email}")

    # Try direct MongoDB query with case-insensitive search
    try:
        # First try exact match
        user_doc = await db.db.users.find_one({"email": email})
        if user_doc:
            print(f"Found user with exact email match: {user_doc.get('email')}")
            print("=== CHECK USER EXISTS ENDPOINT END SUCCESS ===\n")
            return {"exists": True, "email": user_doc.get("email")}

        # Try case-insensitive match
        user_doc = await db.db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
        if user_doc:
            print(f"Found user with case-insensitive match: {user_doc.get('email')}")
            print("=== CHECK USER EXISTS ENDPOINT END SUCCESS ===\n")
            return {"exists": True, "email": user_doc.get("email")}

        print(f"No user found with email: {email}")
        print("=== CHECK USER EXISTS ENDPOINT END SUCCESS ===\n")
        return {"exists": False}
    except Exception as e:
        print(f"Error during MongoDB query: {str(e)}")
        print("=== CHECK USER EXISTS ENDPOINT END WITH ERROR ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
