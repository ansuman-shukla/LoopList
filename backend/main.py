from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.api.api import api_router
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.middleware.cors import setup_cors

# Define lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    await connect_to_mongo()
    yield
    # Shutdown: Close MongoDB connection
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up CORS with permissive settings for development
setup_cors(app)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to LoopList API",
        "version": settings.PROJECT_VERSION,
        "docs": f"/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000, log_level="info")