# app/db.py
from pymongo import MongoClient
from app.core.config import settings

MONGO_URL = settings.MONGO_URL

if not MONGO_URL:
    raise ValueError("MONGO_URL not set in configuration")

client = MongoClient(MONGO_URL)

# Database name: smart_attendance
db = client["smart_attendance"]

users_collection = db["users"]
logs_collection = db["logs"]
leave_requests_collection = db["leave_requests"]
attendance_audit_collection = db["attendance_audit"]
messages_collection = db["messages"]
notifications_collection = db["notifications"]
conversations_collection = db["conversations"]
groups_collection = db["groups"]
files_collection = db["files"]

# ================= BACKGROUND INDEXES =================
# These indexes speed up the most common queries (analytics, logins, reporting).
import pymongo
try:
    # Users
    users_collection.create_index([("email", pymongo.ASCENDING)], unique=True, background=True)
    users_collection.create_index([("username", pymongo.ASCENDING)], unique=True, background=True, sparse=True)
    users_collection.create_index([("role", pymongo.ASCENDING), ("active", pymongo.ASCENDING)], background=True)
    users_collection.create_index([("department", pymongo.ASCENDING)], background=True)
    users_collection.create_index([("active_sessions.session_id", pymongo.ASCENDING)], background=True)
    
    # Logs (Attendance)
    logs_collection.create_index([("email", pymongo.ASCENDING), ("date", pymongo.ASCENDING)], background=True)
    logs_collection.create_index([("date", pymongo.ASCENDING)], background=True)
    logs_collection.create_index([("status", pymongo.ASCENDING)], background=True)
    logs_collection.create_index([("department", pymongo.ASCENDING)], background=True)
    
    # Leave Requests
    leave_requests_collection.create_index([("status", pymongo.ASCENDING)], background=True)
    leave_requests_collection.create_index([("employee_email", pymongo.ASCENDING), ("status", pymongo.ASCENDING)], background=True)
    leave_requests_collection.create_index([("leave_type", pymongo.ASCENDING)], background=True)
    
    # Audit
    attendance_audit_collection.create_index([("timestamp", pymongo.DESCENDING)], background=True)
    
    # Messaging
    messages_collection.create_index([("receiver", pymongo.ASCENDING)], background=True)
    messages_collection.create_index([("sender", pymongo.ASCENDING)], background=True)
    messages_collection.create_index([("timestamp", pymongo.DESCENDING)], background=True)
    
    # Notifications
    notifications_collection.create_index([("user_email", pymongo.ASCENDING)], background=True)
    notifications_collection.create_index([("timestamp", pymongo.DESCENDING)], background=True)
    
    # Groups
    groups_collection.create_index([("members", pymongo.ASCENDING)], background=True)
    
    # Files
    files_collection.create_index([("user_email", pymongo.ASCENDING)], background=True)
    files_collection.create_index([("timestamp", pymongo.DESCENDING)], background=True)
except Exception as e:
    print(f"Warning: Failed to create indexes: {e}")
