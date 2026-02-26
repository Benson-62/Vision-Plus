from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.security import get_current_user
from app.db import files_collection
from datetime import datetime
import uuid
import os

router = APIRouter(prefix="/upload", tags=["File Uploads"])

MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}

@router.post("/")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {ALLOWED_EXTENSIONS}")
        
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
        
    upload_dir = os.path.join("uploads", "general")
    os.makedirs(upload_dir, exist_ok=True)
    
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, unique_filename)
    
    with open(filepath, "wb") as buffer:
        buffer.write(content)
        
    file_url = f"/uploads/general/{unique_filename}"
    
    # Save record to database
    file_record = {
        "filename": file.filename,
        "url": file_url,
        "type": file.content_type,
        "size": len(content),
        "user_email": current_user["email"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    res = files_collection.insert_one(file_record)
    file_record["_id"] = str(res.inserted_id)
    
    return {
        "status": "success",
        "url": file_url,
        "filename": file.filename,
        "type": file.content_type,
        "record": file_record
    }

@router.get("/history")
def get_upload_history(current_user: dict = Depends(get_current_user)):
    user_email = current_user["email"]
    files = list(files_collection.find({"user_email": user_email}).sort("timestamp", -1))
    
    for f in files:
        f["_id"] = str(f["_id"])
        
    return files
