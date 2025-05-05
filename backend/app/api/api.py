from fastapi import APIRouter

from .routes import auth, loops, completions, public, users, clone, friends

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(friends.router, prefix="/friends", tags=["friends"])
api_router.include_router(loops.router, prefix="/loops", tags=["loops"])
api_router.include_router(completions.router, prefix="/loops", tags=["completions"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(clone.router, prefix="/api", tags=["clone"])
