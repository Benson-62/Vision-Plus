# app/db.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

if not MONGO_URL:
    raise ValueError("MONGO_URL not set in .env")

client = MongoClient(MONGO_URL)

# Database name: smart_attendance
db = client["smart_attendance"]

# Collections
users_collection = db["users"]
logs_collection = db["logs"]
