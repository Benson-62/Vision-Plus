import sys
import os

# Ensure the app module path is found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db import users_collection
from app.security import hash_password

users = list(users_collection.find({}))
for user in users:
    # Check if they have legacy 'password'
    if "password" in user and "password_hash" not in user:
        new_hash = hash_password(user["password"])
        users_collection.update_one({"_id": user["_id"]}, {"$set": {"password_hash": new_hash}})
        print(f"Migrated legacy password for {user.get('email')}")
    elif "password_hash" in user:
        p_hash = user["password_hash"]
        if not p_hash.startswith("$2b$"):
            new_hash = hash_password(p_hash)
            users_collection.update_one({"_id": user["_id"]}, {"$set": {"password_hash": new_hash}})
            print(f"Updated plaintext password_hash for {user.get('email')}")

# Also ensure all users are active
users_collection.update_many({"active": {"$exists": False}}, {"$set": {"active": True}})

print("Hash migration complete.")
