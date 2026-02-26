import json
import logging
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, UploadFile, File
from .security import get_current_user, verify_password, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from bson import ObjectId
from pydantic import BaseModel
from .db import messages_collection, notifications_collection, users_collection, groups_collection
from .websocket_manager import manager
from typing import List

router = APIRouter(tags=["Messaging"])
logger = logging.getLogger(__name__)

async def get_current_user_ws(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise ValueError("Token missing sub")
        user = users_collection.find_one({"email": email})
        if user is None:
            raise ValueError("User not found")
        return user
    except JWTError:
        raise ValueError("Invalid JWT")

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        user = await get_current_user_ws(token)
        email = user["email"]
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, email)

    # Deliver unread notifications and messages on connect (optional, but good for UX)
    # Could be fetched via REST instead

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                msg_type = payload.get("type", "chat")
                
                if msg_type == "chat":
                    receiver = payload.get("receiver")
                    receiver_type = payload.get("receiver_type", "user") # 'user' or 'group'
                    text = payload.get("message", "")
                    file_info = payload.get("file")
                    
                    if not receiver or (not text and not file_info):
                        continue
                        
                    msg_doc = {
                        "sender": email,
                        "receiver": receiver,
                        "receiver_type": receiver_type,
                        "message": text,
                        "file": file_info,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "read_status": False,
                        "type": "chat"
                    }
                    
                    # Store in DB
                    res = messages_collection.insert_one(msg_doc)
                    msg_doc["_id"] = str(res.inserted_id)
                    
                    if receiver_type == "user":
                        # Forward immediately to receiver
                        delivered = await manager.send_personal_message(msg_doc, receiver)
                        if delivered:
                            messages_collection.update_one({"_id": res.inserted_id}, {"$set": {"read_status": True}})
                            
                        # Echo back to the sender
                        if email != receiver:
                            await manager.send_personal_message(msg_doc, email)
                    elif receiver_type == "group":
                        # Fetch the group to get members
                        try:
                            group = groups_collection.find_one({"_id": ObjectId(receiver)})
                            if group:
                                for member_email in group.get("members", []):
                                    await manager.send_personal_message(msg_doc, member_email)
                        except Exception as e:
                            logger.error(f"Error broadcasting to group {receiver}: {e}")
                        
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from {email}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, email)


@router.get("/messages")
def get_messages(
    other_email: str = Query(...), 
    is_group: bool = Query(False),
    limit: int = 50, 
    current_user: dict = Depends(get_current_user)
):
    """Fetch chat history between current user and another user, or a group."""
    my_email = current_user["email"]
    
    if is_group:
        query = {
            "receiver": other_email,
            "receiver_type": "group"
        }
    else:
        query = {
            "receiver_type": {"$ne": "group"},
            "$or": [
                {"sender": my_email, "receiver": other_email},
                {"sender": other_email, "receiver": my_email}
            ]
        }
    
    # Ignore messages I deleted for myself
    query["deleted_by"] = {"$ne": my_email}
    
    msgs = list(messages_collection.find(query).sort("timestamp", -1).limit(limit))
    
    # Mark as read if I am the receiver
    unread_ids = [m["_id"] for m in msgs if m["receiver"] == my_email and not m.get("read_status")]
    if unread_ids:
        messages_collection.update_many({"_id": {"$in": unread_ids}}, {"$set": {"read_status": True}})
        
    for m in msgs:
        m["_id"] = str(m["_id"])
        if not m["timestamp"].endswith("Z"):
            m["timestamp"] += "Z"
        
    return list(reversed(msgs))  # Return chronological


@router.get("/notifications")
def get_notifications(
    limit: int = 20, 
    current_user: dict = Depends(get_current_user)
):
    """Fetch recent notifications for the current user."""
    email = current_user["email"]
    msgs = list(notifications_collection.find(
        {"$or": [{"user_email": email}, {"type": "broadcast"}]}
    ).sort("timestamp", -1).limit(limit))
    
    for m in msgs:
        m["_id"] = str(m["_id"])
        
    return msgs

@router.post("/messages/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Handle chat file uploads and return the file URL."""
    # Ensure directory exists
    MAX_FILE_SIZE = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
        
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
        
    upload_dir = os.path.join("uploads", "chat_files")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, unique_filename)
    
    # Write file
    with open(filepath, "wb") as buffer:
        buffer.write(content)
        
    file_url = f"/uploads/chat_files/{unique_filename}"
    
    return {
        "url": file_url,
        "filename": file.filename,
        "type": file.content_type
    }

@router.delete("/messages/me/{msg_id}")
def delete_message_for_me(msg_id: str, current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    try:
        obj_id = ObjectId(msg_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
        
    msg = messages_collection.find_one({"_id": obj_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.get("sender") != email and msg.get("receiver") != email:
        # For groups
        if msg.get("receiver_type") == "group":
            group = groups_collection.find_one({"_id": ObjectId(msg["receiver"])})
            if group and email not in group.get("members", []):
                raise HTTPException(status_code=403, detail="Unauthorized")
        else:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
    messages_collection.update_one(
        {"_id": obj_id},
        {"$addToSet": {"deleted_by": email}}
    )
    return {"status": "success", "message": "Message deleted for you"}

@router.delete("/messages/everyone/{msg_id}")
def delete_message_for_everyone(msg_id: str, current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    role = current_user.get("role", "employee")
    
    try:
        obj_id = ObjectId(msg_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
        
    msg = messages_collection.find_one({"_id": obj_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.get("sender") != email and role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this message for everyone")
        
    messages_collection.update_one(
        {"_id": obj_id},
        {"$set": {
            "is_deleted": True,
            "deleted_for_everyone": True,
            "message": "Message Deleted",
            "file": None
        }}
    )
    
    from app.db import logs_collection # General log for admin actions
    if role in ["admin", "super_admin"] and msg.get("sender") != email:
        from bson import ObjectId
        from app.db import attendance_audit_collection # Using audit collection as generic audit or new one
        # Just printing for simplicity, or storing in general logs
        print(f"Admin {email} deleted message {msg_id} for everyone.")
        
    return {"status": "success", "message": "Message deleted for everyone"}

class GroupCreate(BaseModel):
    name: str
    members: List[str]

@router.post("/groups")
def create_group(group: GroupCreate, current_user: dict = Depends(get_current_user)):
    # Add creator to members if not present
    email = current_user["email"]
    members = list(set(group.members + [email]))
    
    doc = {
        "name": group.name,
        "creator": email,
        "members": members,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    
    res = groups_collection.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc

@router.get("/groups")
def get_user_groups(current_user: dict = Depends(get_current_user)):
    email = current_user["email"]
    groups = list(groups_collection.find({"members": email}))
    for g in groups:
        g["_id"] = str(g["_id"])
    return groups

@router.get("/users/online")
def get_online_users(current_user: dict = Depends(get_current_user)):
    # Returns a list of emails currently connected
    return list(manager.active_connections.keys())
