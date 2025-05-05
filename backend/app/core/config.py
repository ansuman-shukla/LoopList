import os
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "LoopList"
    PROJECT_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # SECURITY
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-development")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 8))  # 8 days
    JWT_ALGORITHM: str = "HS256"

    # MONGODB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb+srv://ansuman-shukla:ansuman@cluster0.zkpcq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "looplist_db")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # React default
        "http://localhost:8000",  # Backend Swagger UI
        "http://localhost:5173",  # Vite default
        "http://localhost:5174",  # Vite alternative port
        "http://127.0.0.1:5173",  # Vite default with IP
        "http://127.0.0.1:5174",  # Vite alternative with IP
        "http://127.0.0.1:3000",  # React with IP
        "*",                      # Allow all origins in development
    ]

settings = Settings()
