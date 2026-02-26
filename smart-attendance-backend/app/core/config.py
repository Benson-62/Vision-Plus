import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # MongoDB Config
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    # JWT & Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-please-change-in-prod-1234")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    # Environment Options
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development") # production or development
    
    # Security Features
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "*").split(",")

settings = Settings()
