from typing import Any, List
# date is used in the clone_loop function
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Path
from bson import ObjectId

from ...db.mongodb import db
from ...models.user import User
from ...models.loop import Loop, VisibilityType, StatusType
from ...models.reaction import ReactionInDB, ReactionCreate
from ..deps import get_current_user

router = APIRouter()

@router.get("/loops/{loop_id}", response_model=Loop)
async def get_public_loop(
    loop_id: str = Path(..., title="The ID of the public loop to get"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get a specific public loop by ID or a friends-only loop if the user is a friend of the loop owner.
    """
    # First try to find the loop with public visibility
    loop = await db.db.loops.find_one({
        "_id": ObjectId(loop_id),
        "visibility": VisibilityType.PUBLIC,
        "status": {"$ne": StatusType.ARCHIVED}
    })

    # If not found, check if it's a friends-only loop and the user is a friend of the owner
    if not loop:
        # Get the loop regardless of visibility to check its owner
        potential_loop = await db.db.loops.find_one({
            "_id": ObjectId(loop_id),
            "visibility": VisibilityType.FRIENDS_ONLY,
            "status": {"$ne": StatusType.ARCHIVED}
        })

        if potential_loop:
            # Get current user from DB to ensure we have the latest data
            db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
            if db_user:
                # Get friend IDs
                friend_ids = db_user.get("friend_ids", [])

                # Check if the loop owner is in the user's friends list
                loop_owner_id = str(potential_loop.get("user_id"))
                if loop_owner_id in [str(fid) for fid in friend_ids]:
                    loop = potential_loop

    if not loop:
        raise HTTPException(status_code=404, detail="Public loop not found")

    # Get total reaction count for this loop using flexible query
    flexible_query = {
        "$or": [
            {"loop_id": ObjectId(loop_id)},
            {"loop_id": loop_id}
        ]
    }
    reaction_count = await db.db.reactions.count_documents(flexible_query)
    print(f"get_public_loop: Found {reaction_count} reactions for loop {loop_id} using flexible query")

    # CRITICAL FIX: Ensure reaction count is at least the stored value
    current_count = loop.get("reaction_count", 0)
    final_count = max(reaction_count, current_count)
    print(f"get_public_loop: Current count in DB: {current_count}, Final count: {final_count}")

    # Add the reaction count to the loop
    loop["reaction_count"] = final_count

    # Update the stored count if it's different
    if final_count != current_count:
        print(f"Updating stored reaction count for loop {loop_id} from {current_count} to {final_count}")
        await db.db.loops.update_one(
            {"_id": ObjectId(loop_id)},
            {"$set": {"reaction_count": final_count}}
        )

    # Get the user information for this loop
    user_id = loop.get("user_id")
    if user_id:
        try:
            # Convert to ObjectId if it's a string
            if isinstance(user_id, str) and ObjectId.is_valid(user_id):
                user_id = ObjectId(user_id)

            # Look up the user in the database
            user = await db.db.users.find_one({"_id": user_id})
            if user and user.get("username"):
                # Add the username to the loop
                loop["user_username"] = user.get("username")
                print(f"Added username '{user.get('username')}' to loop {loop_id}")
            else:
                # If user not found or no username, use a default
                loop["user_username"] = "Anonymous"
                print(f"User not found or no username for user_id {user_id}, using 'Anonymous'")
        except Exception as e:
            print(f"Error getting user information for loop {loop_id}: {str(e)}")
            loop["user_username"] = "Anonymous"
    else:
        loop["user_username"] = "Anonymous"
        print(f"No user_id found for loop {loop_id}, using 'Anonymous'")

    return Loop(**loop)

@router.get("/leaderboard", response_model=List[Loop])
async def get_leaderboard(
    skip: int = 0,
    limit: int = 10,  # Changed default limit to 10
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get the top loops with the highest current_streak, respecting visibility settings.
    Only returns:
    - Public loops from other users (not the current user)
    - Friends-only loops where the current user is a friend of the loop owner

    Note: The current user's own loops are excluded from the Public Loop Boards.
    """
    print("\n=== LEADERBOARD ENDPOINT START ===")
    print(f"Getting leaderboard for user: {current_user.id}")

    # Get current user's friend IDs
    friend_ids = []
    try:
        db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
        if db_user and "friend_ids" in db_user:
            friend_ids = [ObjectId(fid) for fid in db_user.get("friend_ids", [])]
            print(f"Found {len(friend_ids)} friends for user {current_user.id}")
    except Exception as e:
        print(f"Error getting user's friends: {str(e)}")

    # Build a query that respects visibility settings
    # Only include public loops from other users and friends-only loops from friends
    # Exclude all of the current user's loops regardless of visibility

    # First, filter out the current user's ID from the friend_ids list
    friend_ids_without_current_user = [fid for fid in friend_ids if str(fid) != str(current_user.id)]
    print(f"Friend IDs without current user: {friend_ids_without_current_user}")

    query = {
        "status": StatusType.ACTIVE,
        "$or": [
            # Public loops from other users (not the current user)
            {
                "visibility": VisibilityType.PUBLIC,
                "user_id": {"$ne": ObjectId(current_user.id)}
            },

            # Friends-only loops from friends (excluding the current user)
            {
                "visibility": VisibilityType.FRIENDS_ONLY,
                "user_id": {"$in": friend_ids_without_current_user}
            }
        ]
    }

    print(f"Leaderboard query: {query}")

    # Get the loops with highest current_streak
    loops = await db.db.loops.find(query).sort("current_streak", -1).limit(limit).to_list(length=limit)

    # Enhance loops with reaction counts and user information
    result_loops = []
    for loop in loops:
        # Get total reaction count for this loop using flexible query
        loop_id = loop["_id"]
        flexible_query = {
            "$or": [
                {"loop_id": loop_id},
                {"loop_id": str(loop_id)}
            ]
        }
        reaction_count = await db.db.reactions.count_documents(flexible_query)
        print(f"get_leaderboard: Found {reaction_count} reactions for loop {loop_id} using flexible query")

        # CRITICAL FIX: Ensure reaction count is at least the stored value
        current_count = loop.get("reaction_count", 0)
        final_count = max(reaction_count, current_count)
        print(f"get_leaderboard: Current count in DB: {current_count}, Final count: {final_count}")

        # Add the reaction count to the loop
        loop["reaction_count"] = final_count

        # Update the stored count if it's different
        if final_count != current_count:
            print(f"Updating stored reaction count for loop {loop['_id']} from {current_count} to {final_count}")
            await db.db.loops.update_one(
                {"_id": loop["_id"]},
                {"$set": {"reaction_count": final_count}}
            )

        # Get the user information for this loop
        user_id = loop.get("user_id")
        if user_id:
            try:
                # Convert to ObjectId if it's a string
                if isinstance(user_id, str) and ObjectId.is_valid(user_id):
                    user_id = ObjectId(user_id)

                # Look up the user in the database
                user = await db.db.users.find_one({"_id": user_id})
                if user and user.get("username"):
                    # Add the username to the loop
                    loop["user_username"] = user.get("username")
                    print(f"Added username '{user.get('username')}' to loop {loop_id}")
                else:
                    # If user not found or no username, use a default
                    loop["user_username"] = "Anonymous"
                    print(f"User not found or no username for user_id {user_id}, using 'Anonymous'")
            except Exception as e:
                print(f"Error getting user information for loop {loop_id}: {str(e)}")
                loop["user_username"] = "Anonymous"
        else:
            loop["user_username"] = "Anonymous"
            print(f"No user_id found for loop {loop_id}, using 'Anonymous'")

        # Add to result
        result_loops.append(Loop(**loop))

    print(f"Returning {len(result_loops)} loops for leaderboard")
    print("=== LEADERBOARD ENDPOINT END ===\n")
    return result_loops

@router.post("/loops/{loop_id}/react", response_model=int)
async def react_to_loop(
    reaction_in: ReactionCreate,  # Keep this parameter for API compatibility
    loop_id: str = Path(..., title="The ID of the loop to react to"),
    current_user: User = Depends(get_current_user)
) -> int:
    """
    React to a public loop with the fire heart emoji (❤️‍🔥).
    """
    # Use the emoji from reaction_in if provided, otherwise use default
    # This is not used currently but kept for future extensibility
    _ = getattr(reaction_in, 'emoji', "❤️‍🔥")
    print("\n=== BACKEND REACTION HANDLER START ===")
    print(f"Received reaction request for loop_id: {loop_id}, user_id: {current_user.id}")

    try:
        # Check if loop exists and is public or friends-only
        print(f"Checking if loop exists with ID: {loop_id}")

        # First check if it's a public loop
        loop = await db.db.loops.find_one({
            "_id": ObjectId(loop_id),
            "visibility": VisibilityType.PUBLIC,
            "status": {"$ne": StatusType.ARCHIVED}
        })

        # If not public, check if it's a friends-only loop and the user is a friend of the owner
        if not loop:
            # Get the loop regardless of visibility to check its owner
            potential_loop = await db.db.loops.find_one({
                "_id": ObjectId(loop_id),
                "visibility": VisibilityType.FRIENDS_ONLY,
                "status": {"$ne": StatusType.ARCHIVED}
            })

            if potential_loop:
                # Get current user from DB to ensure we have the latest data
                db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
                if db_user:
                    # Get friend IDs
                    friend_ids = db_user.get("friend_ids", [])

                    # Check if the loop owner is in the user's friends list
                    loop_owner_id = str(potential_loop.get("user_id"))
                    if loop_owner_id in [str(fid) for fid in friend_ids]:
                        loop = potential_loop

        if not loop:
            print(f"Loop not found, not public, or not from a friend: {loop_id}")
            raise HTTPException(status_code=404, detail="Loop not found or not accessible")

        print(f"Found loop: {loop.get('_id')} - {loop.get('title')}")
        print(f"Current reaction_count in DB: {loop.get('reaction_count', 0)}")

        # Check if user already reacted to this loop
        print(f"Checking if user {current_user.id} already reacted to loop {loop_id}")
        print(f"Query: loop_id={ObjectId(loop_id)}, user_id={ObjectId(current_user.id)}")

        # First count all reactions for this loop to verify
        all_reactions_count = await db.db.reactions.count_documents({"loop_id": ObjectId(loop_id)})
        print(f"Total reactions for this loop before checking user reaction: {all_reactions_count}")

        # List all reactions for this loop for debugging
        all_reactions = await db.db.reactions.find({"loop_id": ObjectId(loop_id)}).to_list(length=100)
        print(f"All reactions for this loop: {len(all_reactions)}")
        for idx, reaction in enumerate(all_reactions):
            print(f"  Reaction {idx+1}: user_id={reaction.get('user_id')}, emoji={reaction.get('emoji', 'not set')}")

        existing_reaction = await db.db.reactions.find_one({
            "loop_id": ObjectId(loop_id),
            "user_id": ObjectId(current_user.id)
        })

        if existing_reaction:
            print(f"User already reacted to this loop. Reaction ID: {existing_reaction.get('_id')}")
        else:
            print("User has not reacted to this loop yet. Creating new reaction.")
            # Create new reaction
            # CRITICAL FIX: Ensure loop_id is stored as ObjectId
            loop_id_obj = ObjectId(loop_id)
            print(f"Creating reaction with loop_id as ObjectId: {loop_id_obj}, type: {type(loop_id_obj)}")

            reaction_data = {
                "loop_id": loop_id_obj,
                "user_id": ObjectId(current_user.id)
            }

            reaction = ReactionInDB(**reaction_data)
            print(f"Created reaction object: {reaction}")

            # Convert to dict for MongoDB - handle Pydantic v2 compatibility
            try:
                reaction_dict = reaction.model_dump(by_alias=True)
                print("Used model_dump() for conversion")
            except AttributeError:
                # Fallback for older Pydantic versions
                # Using dict() with a warning since it's deprecated
                reaction_dict = reaction.dict(by_alias=True)
                print("WARNING: Used deprecated dict() method for conversion")

            # Remove _id field completely to let MongoDB generate a new one
            if '_id' in reaction_dict:
                del reaction_dict['_id']
                print("Removed _id field from reaction dict")

            insert_result = await db.db.reactions.insert_one(reaction_dict)
            print(f"Inserted new reaction with ID: {insert_result.inserted_id}")

        # Get total reaction count
        print(f"Counting total reactions for loop {loop_id}")

        # Debug: List all reactions for this loop with more detailed debugging
        print("DEBUG: Listing all reactions for this loop:")
        print(f"Loop ID for query: {loop_id}, type: {type(loop_id)}")
        print(f"ObjectId version: {ObjectId(loop_id)}, type: {type(ObjectId(loop_id))}")

        # First try with string ID to debug
        print("Trying to find reactions with string loop_id...")
        string_reactions = await db.db.reactions.find({"loop_id": loop_id}).to_list(length=100)
        print(f"Found {len(string_reactions)} reactions with string loop_id")

        # Now try with ObjectId
        print("Trying to find reactions with ObjectId loop_id...")
        reactions_cursor = db.db.reactions.find({"loop_id": ObjectId(loop_id)})
        reactions_list = await reactions_cursor.to_list(length=100)
        print(f"Found {len(reactions_list)} reactions with ObjectId loop_id")

        # Print all reactions for debugging
        for idx, reaction in enumerate(reactions_list):
            print(f"  Reaction {idx+1}: ID={reaction.get('_id')}, User={reaction.get('user_id')}")

        # CRITICAL FIX: Try a more flexible query to find all reactions
        print("Trying a more flexible query to find all reactions...")
        flexible_query = {
            "$or": [
                {"loop_id": ObjectId(loop_id)},
                {"loop_id": loop_id}
            ]
        }
        all_reactions = await db.db.reactions.find(flexible_query).to_list(length=100)
        print(f"Found {len(all_reactions)} reactions with flexible query")

        # Print all reactions from flexible query
        for idx, reaction in enumerate(all_reactions):
            print(f"  Flexible Reaction {idx+1}: ID={reaction.get('_id')}, User={reaction.get('user_id')}, loop_id={reaction.get('loop_id')}")

        # Count the reactions using the flexible query
        total_count = len(all_reactions)
        print(f"Total reaction count (from flexible list): {total_count}")

        # Double-check with count_documents
        count_docs = await db.db.reactions.count_documents(flexible_query)
        print(f"Total reaction count (from flexible count_documents): {count_docs}")

        # Ensure we're using the correct count
        if total_count != count_docs:
            print(f"WARNING: Count mismatch! List count: {total_count}, count_documents: {count_docs}")
            # Use the higher count to be safe
            total_count = max(total_count, count_docs)
            print(f"Using count: {total_count}")

        # CRITICAL FIX: Ensure count is at least 1 if we just added a reaction
        # This is the key fix for the reaction count issue
        if not existing_reaction:
            print("User just added a reaction, ensuring count is at least 1")
            total_count = max(total_count, 1)
            print(f"Final count after ensuring minimum of 1: {total_count}")
        elif total_count < 1:
            print("WARNING: Count is 0 but reactions exist! Forcing to 1.")
            total_count = 1

        # Update the reaction_count field in the loop document
        print(f"Updating reaction_count in loop document to {total_count}")

        # First, get the current loop to ensure we have the latest data
        current_loop = await db.db.loops.find_one({"_id": ObjectId(loop_id)})
        current_count = current_loop.get("reaction_count", 0)
        print(f"Current reaction_count in database before update: {current_count}")

        # CRITICAL FIX: Always update the reaction count to ensure it's correct
        # This ensures the count is always up-to-date, even if there's a race condition
        update_result = await db.db.loops.update_one(
            {"_id": ObjectId(loop_id)},
            {"$set": {"reaction_count": total_count}}
        )
        print(f"Update result: matched={update_result.matched_count}, modified={update_result.modified_count}")

        # Additional check to ensure the update was successful
        if update_result.modified_count == 0 and current_count != total_count:
            print(f"WARNING: Update did not modify any documents but counts differ! Retrying update.")
            # Try a more forceful update
            update_result = await db.db.loops.update_one(
                {"_id": ObjectId(loop_id)},
                {"$set": {"reaction_count": total_count}},
                upsert=True
            )
            print(f"Forced update result: matched={update_result.matched_count}, modified={update_result.modified_count}, upserted_id={update_result.upserted_id}")

        # Verify the update
        updated_loop = await db.db.loops.find_one({"_id": ObjectId(loop_id)})
        print(f"Verified loop reaction_count after update: {updated_loop.get('reaction_count', 0)}")

        print("=== BACKEND REACTION HANDLER END ===\n")
        # Return the count directly
        return total_count

    except Exception as e:
        print(f"ERROR in react_to_loop: {str(e)}")
        print(f"Error type: {type(e)}")
        print("=== BACKEND REACTION HANDLER END WITH ERROR ===\n")
        raise

@router.delete("/loops/{loop_id}/react", response_model=int)
async def delete_reaction(
    loop_id: str = Path(..., title="The ID of the loop to remove reaction from"),
    current_user: User = Depends(get_current_user)
) -> int:
    """
    Remove a fire heart reaction (❤️‍🔥) from a public loop.
    """
    print("\n=== BACKEND DELETE REACTION HANDLER START ===")
    print(f"Received delete reaction request for loop_id: {loop_id}, user_id: {current_user.id}")

    try:
        # Check if loop exists and is public or friends-only
        print(f"Checking if loop exists with ID: {loop_id}")

        # First check if it's a public loop
        loop = await db.db.loops.find_one({
            "_id": ObjectId(loop_id),
            "visibility": VisibilityType.PUBLIC,
            "status": {"$ne": StatusType.ARCHIVED}
        })

        # If not public, check if it's a friends-only loop and the user is a friend of the owner
        if not loop:
            # Get the loop regardless of visibility to check its owner
            potential_loop = await db.db.loops.find_one({
                "_id": ObjectId(loop_id),
                "visibility": VisibilityType.FRIENDS_ONLY,
                "status": {"$ne": StatusType.ARCHIVED}
            })

            if potential_loop:
                # Get current user from DB to ensure we have the latest data
                db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
                if db_user:
                    # Get friend IDs
                    friend_ids = db_user.get("friend_ids", [])

                    # Check if the loop owner is in the user's friends list
                    loop_owner_id = str(potential_loop.get("user_id"))
                    if loop_owner_id in [str(fid) for fid in friend_ids]:
                        loop = potential_loop

        if not loop:
            print(f"Loop not found, not public, or not from a friend: {loop_id}")
            raise HTTPException(status_code=404, detail="Loop not found or not accessible")

        print(f"Found loop: {loop.get('_id')} - {loop.get('title')}")
        print(f"Current reaction_count in DB: {loop.get('reaction_count', 0)}")

        # Delete the reaction
        print(f"Deleting reaction for user {current_user.id} on loop {loop_id}")
        delete_result = await db.db.reactions.delete_one({
            "loop_id": ObjectId(loop_id),
            "user_id": ObjectId(current_user.id)
        })
        print(f"Delete result: deleted_count={delete_result.deleted_count}")

        # Get total reaction count
        print(f"Counting total reactions for loop {loop_id} after deletion")
        total_count = await db.db.reactions.count_documents({"loop_id": ObjectId(loop_id)})
        print(f"Total reaction count after deletion: {total_count}")

        # Update the reaction_count field in the loop document
        print(f"Updating reaction_count in loop document to {total_count}")

        # First, get the current loop to ensure we have the latest data
        current_loop = await db.db.loops.find_one({"_id": ObjectId(loop_id)})
        current_count = current_loop.get("reaction_count", 0)
        print(f"Current reaction_count in database before update: {current_count}")

        # Only update if the count has changed
        if current_count != total_count:
            update_result = await db.db.loops.update_one(
                {"_id": ObjectId(loop_id)},
                {"$set": {"reaction_count": total_count}}
            )
            print(f"Update result: matched={update_result.matched_count}, modified={update_result.modified_count}")
        else:
            print(f"No update needed, reaction_count already at {total_count}")

        # Verify the update
        updated_loop = await db.db.loops.find_one({"_id": ObjectId(loop_id)})
        print(f"Verified loop reaction_count after update: {updated_loop.get('reaction_count', 0)}")

        print("=== BACKEND DELETE REACTION HANDLER END ===\n")
        # Return the count directly
        return total_count

    except Exception as e:
        print(f"ERROR in delete_reaction: {str(e)}")
        print(f"Error type: {type(e)}")
        print("=== BACKEND DELETE REACTION HANDLER END WITH ERROR ===\n")
        raise

@router.post("/loops/{loop_id}/clone", response_model=Loop)
async def clone_loop(
    loop_id: str = Path(..., title="The ID of the loop to clone"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Clone a public loop.
    """
    # Check if loop exists and is public, friends-only (if friend), or belongs to the user
    # First, get the loop to check its visibility
    loop = await db.db.loops.find_one({
        "_id": ObjectId(loop_id),
        "status": {"$ne": StatusType.ARCHIVED}
    })

    if not loop:
        raise HTTPException(status_code=404, detail="Loop not found")

    # If it's the user's own loop, allow cloning
    if str(loop.get("user_id")) == str(current_user.id):
        pass  # Allow access to own loops
    # If it's public, allow cloning
    elif loop.get("visibility") == VisibilityType.PUBLIC:
        pass  # Allow access to public loops
    # If it's friends-only, check if user is a friend of the owner
    elif loop.get("visibility") == VisibilityType.FRIENDS_ONLY:
        # Get current user from DB to ensure we have the latest data
        db_user = await db.db.users.find_one({"_id": ObjectId(current_user.id)})
        if not db_user:
            raise HTTPException(status_code=404, detail="Loop not available for cloning")

        # Get friend IDs
        friend_ids = db_user.get("friend_ids", [])

        # Check if the loop owner is in the user's friends list
        loop_owner_id = str(loop.get("user_id"))
        if loop_owner_id not in [str(fid) for fid in friend_ids]:
            raise HTTPException(status_code=404, detail="Loop not available for cloning")
    else:
        # Private loop that doesn't belong to the user
        raise HTTPException(status_code=404, detail="Loop not available for cloning")

    # Create a new loop based on the original
    from datetime import date

    new_loop_data = {
        "title": loop["title"],
        "frequency_type": loop["frequency_type"],
        "frequency_details": loop["frequency_details"],
        "start_date": date.today(),
        "visibility": VisibilityType.PRIVATE,
        "status": StatusType.ACTIVE,
        "icon": loop.get("icon"),
        "cover_image_url": loop.get("cover_image_url"),
        "user_id": ObjectId(current_user.id),
        "current_streak": 0,
        "longest_streak": 0,
        "clone_count": 0
    }

    # Insert the new loop
    from ...models.loop import LoopInDB

    # Debug logging
    print(f"Creating new loop with data: {new_loop_data}")

    try:
        new_loop = LoopInDB(**new_loop_data)
        print(f"New loop created: {new_loop}")
    except Exception as e:
        print(f"Error creating new loop: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating new loop: {str(e)}")

    # Convert to dict for MongoDB - handle Pydantic v2 compatibility
    try:
        loop_dict = new_loop.model_dump(by_alias=True)
        print(f"Loop dict after model_dump: {loop_dict}")
    except AttributeError:
        # Fallback for older Pydantic versions
        # Using dict() with a warning since it's deprecated
        loop_dict = new_loop.dict(by_alias=True)
        print(f"WARNING: Used deprecated dict() method for conversion. Loop dict: {loop_dict}")

    # Ensure ObjectId is properly handled
    if '_id' in loop_dict:
        if isinstance(loop_dict['_id'], str) and loop_dict['_id']:
            # Only convert non-empty string to ObjectId
            loop_dict['_id'] = ObjectId(loop_dict['_id'])
        elif not loop_dict['_id'] or loop_dict['_id'] == '':
            # If _id is empty or None, remove it so MongoDB will generate one
            del loop_dict['_id']

    # Convert date objects to strings for MongoDB
    if 'start_date' in loop_dict and isinstance(loop_dict['start_date'], date):
        loop_dict['start_date'] = loop_dict['start_date'].isoformat()

    if 'end_date' in loop_dict and loop_dict['end_date'] is not None and isinstance(loop_dict['end_date'], date):
        loop_dict['end_date'] = loop_dict['end_date'].isoformat()

    try:
        print(f"Inserting loop into MongoDB: {loop_dict}")
        result = await db.db.loops.insert_one(loop_dict)
        print(f"Insert result: {result.inserted_id}")

        # Increment clone_count on the original loop
        await db.db.loops.update_one(
            {"_id": ObjectId(loop_id)},
            {"$inc": {"clone_count": 1}}
        )

        # Return the new loop
        created_loop = await db.db.loops.find_one({"_id": result.inserted_id})

        if not created_loop:
            print("Error: Could not find the newly created loop")
            raise HTTPException(status_code=500, detail="Failed to retrieve the newly created loop")

        print(f"Created loop retrieved from DB: {created_loop}")

        # Convert to Loop model and return
        try:
            loop_model = Loop(**created_loop)
            print(f"Returning loop model: {loop_model}")
            return loop_model
        except Exception as e:
            print(f"Error converting loop to model: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing created loop: {str(e)}")

    except Exception as e:
        print(f"Error in MongoDB operations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
