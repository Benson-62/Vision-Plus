from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.security import get_current_user
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
    
    return {
        "status": "success",
        "url": file_url,
        "filename": file.filename,
        "type": file.content_type
    }
